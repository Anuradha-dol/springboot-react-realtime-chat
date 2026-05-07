package com.yourname.chatapp.message.service;

import com.yourname.chatapp.common.enums.MessageStatus;
import com.yourname.chatapp.common.enums.MessageType;
import com.yourname.chatapp.common.exception.ResourceNotFoundException;
import com.yourname.chatapp.message.dto.MessageResponse;
import com.yourname.chatapp.message.dto.SendMessageRequest;
import com.yourname.chatapp.message.entity.Message;
import com.yourname.chatapp.message.repository.MessageRepository;
import com.yourname.chatapp.security.CurrentUserService;
import com.yourname.chatapp.user.entity.User;
import com.yourname.chatapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public MessageResponse send(SendMessageRequest request) {
        User sender = currentUserService.getCurrentUser();
        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new IllegalArgumentException("Message content is required.");
        }

        Long chatId = request.getChatId() == null ? 1L : request.getChatId();
        MessageType type = request.getMessageType() == null ? MessageType.TEXT : request.getMessageType();

        Message message = Message.builder()
            .chatId(chatId)
            .senderId(sender.getId())
            .content(request.getContent() == null ? "" : request.getContent().trim())
            .messageType(type)
            .status(MessageStatus.SENT)
            .createdAt(LocalDateTime.now())
            .build();

        Message saved = messageRepository.save(message);
        return toResponse(saved, resolveDisplayName(sender));
    }

    public List<MessageResponse> getByChatId(Long chatId) {
        List<Message> messages = messageRepository.findByChatIdOrderByCreatedAtAsc(chatId);

        List<Long> senderIds = messages.stream()
            .map(Message::getSenderId)
            .distinct()
            .collect(Collectors.toList());

        Map<Long, String> senderNames = new HashMap<>();
        if (!senderIds.isEmpty()) {
            userRepository.findAllById(senderIds).forEach(user -> {
                String name = resolveDisplayName(user);
                senderNames.put(user.getId(), name);
            });
        }

        return messages.stream()
            .filter(message -> senderNames.containsKey(message.getSenderId()))
            .map(message -> toResponse(message, senderNames.get(message.getSenderId())))
            .collect(Collectors.toList());
    }

    private MessageResponse toResponse(Message message, String senderName) {
        MessageResponse response = new MessageResponse();
        response.setId(message.getId());
        response.setChatId(message.getChatId());
        response.setSenderId(message.getSenderId());
        response.setSenderName(senderName);
        response.setContent(message.getContent());
        response.setMessageType(message.getMessageType());
        response.setStatus(message.getStatus());
        response.setCreatedAt(message.getCreatedAt());
        return response;
    }

    private String resolveDisplayName(User user) {
        return (user.getDisplayName() == null || user.getDisplayName().isBlank())
            ? user.getUsername()
            : user.getDisplayName();
    }

    public void deleteMessage(Long id) {
        if (!messageRepository.existsById(id)) {
            throw new ResourceNotFoundException("Message not found: " + id);
        }
        messageRepository.deleteById(id);
    }
}
