package com.yourname.chatapp.chat.websocket.service;

import com.yourname.chatapp.chat.groupchat.repository.GroupMemberRepository;
import com.yourname.chatapp.chat.websocket.dto.PresenceEvent;
import com.yourname.chatapp.chat.websocket.dto.TypingStatusEvent;
import com.yourname.chatapp.user.entity.User;
import com.yourname.chatapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class ChatRealtimeService {
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void publishPrivateTyping(TypingStatusEvent event, String username) {
        if (event.getTargetUserId() == null) {
            return;
        }
        // Realtime events should ignore deleted accounts.
        User fromUser = userRepository.findByUsernameIgnoreCaseAndDeletedFalse(username).orElse(null);
        if (fromUser == null) {
            return;
        }
        User target = userRepository.findByIdAndDeletedFalse(event.getTargetUserId()).orElse(null);
        if (target == null || target.getId().equals(fromUser.getId())) {
            return;
        }

        TypingStatusEvent outgoing = new TypingStatusEvent();
        outgoing.setFromUserId(fromUser.getId());
        outgoing.setFromUsername(fromUser.getUsername());
        outgoing.setTargetUserId(target.getId());
        outgoing.setTyping(Boolean.TRUE.equals(event.getTyping()));
        messagingTemplate.convertAndSendToUser(target.getUsername(), "/queue/typing", outgoing);
    }

    @Transactional(readOnly = true)
    public void publishGroupTyping(TypingStatusEvent event, String username) {
        if (event.getGroupId() == null) {
            return;
        }
        User fromUser = userRepository.findByUsernameIgnoreCaseAndDeletedFalse(username).orElse(null);
        if (fromUser == null) {
            return;
        }
        if (!groupMemberRepository.existsByGroupChatIdAndUserId(event.getGroupId(), fromUser.getId())) {
            return;
        }

        TypingStatusEvent outgoing = new TypingStatusEvent();
        outgoing.setFromUserId(fromUser.getId());
        outgoing.setFromUsername(fromUser.getUsername());
        outgoing.setGroupId(event.getGroupId());
        outgoing.setTyping(Boolean.TRUE.equals(event.getTyping()));
        messagingTemplate.convertAndSend("/topic/group/" + event.getGroupId() + "/typing", outgoing);
    }

    @Transactional
    public void updatePresence(String username, boolean online) {
        User user = userRepository.findByUsernameIgnoreCaseAndDeletedFalse(username).orElse(null);
        if (user == null) {
            return;
        }
        user.setOnline(online);
        if (!online) {
            user.setLastSeen(LocalDateTime.now(ZoneOffset.UTC));
        }
        userRepository.save(user);

        PresenceEvent event = new PresenceEvent();
        event.setUserId(user.getId());
        event.setUsername(user.getUsername());
        event.setOnline(online);
        event.setLastSeen(user.getLastSeen());
        messagingTemplate.convertAndSend("/topic/presence", event);
    }
}
