package com.yourname.chatapp.chat.privatechat.service;

import com.yourname.chatapp.chat.privatechat.dto.ConversationSummaryResponse;
import com.yourname.chatapp.chat.privatechat.dto.PrivateMessageResponse;
import com.yourname.chatapp.chat.privatechat.dto.SendPrivateMediaRequest;
import com.yourname.chatapp.chat.privatechat.dto.SendPrivateTextRequest;
import com.yourname.chatapp.chat.privatechat.entity.PrivateMessage;
import com.yourname.chatapp.chat.privatechat.repository.PrivateMessageRepository;
import com.yourname.chatapp.common.enums.MessageType;
import com.yourname.chatapp.security.CurrentUserService;
import com.yourname.chatapp.user.entity.User;
import com.yourname.chatapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PrivateChatServiceImpl implements PrivateChatService {
    private final PrivateMessageRepository privateMessageRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional(readOnly = true)
    public List<ConversationSummaryResponse> getMyConversations() {
        User me = currentUserService.getCurrentUser();
        List<PrivateMessage> visibleMessages = privateMessageRepository.findVisibleMessagesForUser(me.getId());
        Map<Long, ConversationSummaryResponse> summaries = new LinkedHashMap<>();

        for (PrivateMessage message : visibleMessages) {
            User other = message.getSender().getId().equals(me.getId()) ? message.getReceiver() : message.getSender();
            summaries.computeIfAbsent(other.getId(), key -> {
                ConversationSummaryResponse response = new ConversationSummaryResponse();
                response.setUserId(other.getId());
                response.setUsername(other.getUsername());
                response.setDisplayName(resolveDisplayName(other));
                response.setProfileImageUrl(other.getProfileImageUrl());
                response.setOnline(Boolean.TRUE.equals(other.getOnline()));
                response.setLastSeen(other.getLastSeen());
                return response;
            });

            ConversationSummaryResponse summary = summaries.get(other.getId());
            if (summary.getLastMessageAt() == null) {
                summary.setLastMessage(message.getContent() == null || message.getContent().isBlank() ? "[media]" : message.getContent());
                summary.setLastMessageAt(message.getCreatedAt());
            }

            if (message.getReceiver().getId().equals(me.getId())
                && message.getSender().getId().equals(other.getId())
                && !Boolean.TRUE.equals(message.getIsRead())) {
                summary.setUnread(true);
            }
        }

        return new ArrayList<>(summaries.values());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrivateMessageResponse> getConversation(Long otherUserId) {
        User me = currentUserService.getCurrentUser();
        if (!userRepository.existsById(otherUserId)) {
            throw new IllegalArgumentException("Receiver user not found.");
        }
        return privateMessageRepository.findConversation(me.getId(), otherUserId)
            .stream()
            .map(message -> toResponse(message, me.getId()))
            .toList();
    }

    @Override
    @Transactional
    public PrivateMessageResponse sendText(SendPrivateTextRequest request) {
        User me = currentUserService.getCurrentUser();
        User receiver = findReceiver(request.getReceiverId(), me.getId());
        PrivateMessage replyToMessage = resolveReplyToMessage(request.getReplyToMessageId(), me, receiver);

        PrivateMessage message = PrivateMessage.builder()
            .sender(me)
            .receiver(receiver)
            .content(request.getContent().trim())
            .replyToMessage(replyToMessage)
            .messageType(MessageType.TEXT)
            .isRead(false)
            .senderDeleted(false)
            .receiverDeleted(false)
            .deletedForEveryone(false)
            .build();
        PrivateMessage saved = privateMessageRepository.save(message);
        PrivateMessageResponse response = toResponse(saved, me.getId());
        publishPrivateMessage(response, saved.getSender().getUsername(), saved.getReceiver().getUsername());
        return response;
    }

    @Override
    @Transactional
    public PrivateMessageResponse sendMedia(SendPrivateMediaRequest request) {
        User me = currentUserService.getCurrentUser();
        User receiver = findReceiver(request.getReceiverId(), me.getId());
        PrivateMessage replyToMessage = resolveReplyToMessage(request.getReplyToMessageId(), me, receiver);
        if (request.getMessageType() == MessageType.TEXT) {
            throw new IllegalArgumentException("Use text API for text messages.");
        }

        PrivateMessage message = PrivateMessage.builder()
            .sender(me)
            .receiver(receiver)
            .content(request.getContent() == null ? "" : request.getContent().trim())
            .replyToMessage(replyToMessage)
            .messageType(request.getMessageType())
            .mediaUrl(request.getMediaUrl())
            .isRead(false)
            .senderDeleted(false)
            .receiverDeleted(false)
            .deletedForEveryone(false)
            .build();
        PrivateMessage saved = privateMessageRepository.save(message);
        PrivateMessageResponse response = toResponse(saved, me.getId());
        publishPrivateMessage(response, saved.getSender().getUsername(), saved.getReceiver().getUsername());
        return response;
    }

    @Override
    @Transactional
    public void markAsRead(Long messageId) {
        User me = currentUserService.getCurrentUser();
        PrivateMessage message = privateMessageRepository.findByIdAndParticipant(messageId, me.getId())
            .orElseThrow(() -> new IllegalArgumentException("Message not found."));

        if (!message.getReceiver().getId().equals(me.getId())) {
            throw new IllegalArgumentException("Only receiver can mark message as read.");
        }
        message.setIsRead(true);
        privateMessageRepository.save(message);
    }

    @Override
    @Transactional
    public void deleteForMe(Long messageId) {
        User me = currentUserService.getCurrentUser();
        PrivateMessage message = privateMessageRepository.findByIdAndParticipant(messageId, me.getId())
            .orElseThrow(() -> new IllegalArgumentException("Message not found."));

        if (message.getSender().getId().equals(me.getId())) {
            message.setSenderDeleted(true);
        } else {
            message.setReceiverDeleted(true);
        }
        privateMessageRepository.save(message);
    }

    @Override
    @Transactional
    public void deleteForEveryone(Long messageId) {
        User me = currentUserService.getCurrentUser();
        PrivateMessage message = privateMessageRepository.findByIdAndParticipant(messageId, me.getId())
            .orElseThrow(() -> new IllegalArgumentException("Message not found."));

        if (!message.getSender().getId().equals(me.getId())) {
            throw new IllegalArgumentException("Only sender can delete for everyone.");
        }
        message.setDeletedForEveryone(true);
        message.setContent("This message was deleted.");
        message.setMediaUrl(null);
        privateMessageRepository.save(message);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canAccessMediaUrl(Long userId, String mediaUrl) {
        return privateMessageRepository.existsByMediaUrlAndSenderIdOrMediaUrlAndReceiverId(mediaUrl, userId, mediaUrl, userId);
    }

    @Override
    @Transactional
    public void cleanupUserData(Long userId) {
        privateMessageRepository.deleteAllBySenderIdOrReceiverId(userId, userId);
    }

    private User findReceiver(Long receiverId, Long currentUserId) {
        if (receiverId == null) {
            throw new IllegalArgumentException("Receiver is required.");
        }
        if (receiverId.equals(currentUserId)) {
            throw new IllegalArgumentException("Cannot send private message to yourself.");
        }
        return userRepository.findById(receiverId)
            .orElseThrow(() -> new IllegalArgumentException("Receiver user not found."));
    }

    private PrivateMessage resolveReplyToMessage(Long replyToMessageId, User sender, User receiver) {
        if (replyToMessageId == null) {
            return null;
        }

        PrivateMessage replyToMessage = privateMessageRepository.findById(replyToMessageId)
            .orElseThrow(() -> new IllegalArgumentException("Reply message not found."));
        if (Boolean.TRUE.equals(replyToMessage.getDeletedForEveryone())) {
            throw new IllegalArgumentException("Cannot reply to deleted message.");
        }

        Long senderId = sender.getId();
        Long receiverId = receiver.getId();
        boolean sameConversation =
            (replyToMessage.getSender().getId().equals(senderId) && replyToMessage.getReceiver().getId().equals(receiverId)) ||
            (replyToMessage.getSender().getId().equals(receiverId) && replyToMessage.getReceiver().getId().equals(senderId));
        if (!sameConversation) {
            throw new IllegalArgumentException("Reply message does not belong to this conversation.");
        }

        return replyToMessage;
    }

    private String buildReplyPreview(PrivateMessage message) {
        if (message == null) {
            return "";
        }
        String content = message.getContent() == null ? "" : message.getContent().trim();
        if (!content.isBlank()) {
            return content;
        }
        return switch (message.getMessageType()) {
            case IMAGE -> "Photo";
            case VIDEO -> "Video";
            case FILE -> "File";
            case POLL -> "Poll";
            case TEXT -> "Message";
        };
    }

    private PrivateMessageResponse toResponse(PrivateMessage message, Long currentUserId) {
        PrivateMessageResponse response = new PrivateMessageResponse();
        response.setId(message.getId());
        response.setSenderId(message.getSender().getId());
        response.setSenderName(resolveDisplayName(message.getSender()));
        response.setReceiverId(message.getReceiver().getId());
        response.setReceiverName(resolveDisplayName(message.getReceiver()));
        response.setContent(message.getContent());
        response.setMessageType(message.getMessageType());
        response.setMediaUrl(message.getMediaUrl());
        PrivateMessage replyToMessage = message.getReplyToMessage();
        if (replyToMessage != null) {
            response.setReplyToMessageId(replyToMessage.getId());
            response.setReplyToSenderId(replyToMessage.getSender().getId());
            response.setReplyToSenderName(resolveDisplayName(replyToMessage.getSender()));
            response.setReplyToMessageType(replyToMessage.getMessageType());
            response.setReplyToContent(buildReplyPreview(replyToMessage));
        }
        response.setRead(message.getIsRead());
        response.setMine(message.getSender().getId().equals(currentUserId));
        response.setCreatedAt(message.getCreatedAt());
        response.setUpdatedAt(message.getUpdatedAt());
        return response;
    }

    private String resolveDisplayName(User user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
            return user.getDisplayName();
        }
        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String full = (first + " " + last).trim();
        return full.isBlank() ? user.getUsername() : full;
    }

    private void publishPrivateMessage(PrivateMessageResponse response, String senderUsername, String receiverUsername) {
        messagingTemplate.convertAndSendToUser(senderUsername, "/queue/private-messages", response);
        messagingTemplate.convertAndSendToUser(receiverUsername, "/queue/private-messages", response);
    }
}
