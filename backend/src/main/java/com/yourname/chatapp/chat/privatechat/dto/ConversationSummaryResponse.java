package com.yourname.chatapp.chat.privatechat.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ConversationSummaryResponse {
    private Long userId;
    private String username;
    private String displayName;
    private String profileImageUrl;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private Boolean unread;
    private Boolean online;
    private LocalDateTime lastSeen;
}
