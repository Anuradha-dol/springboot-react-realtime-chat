package com.yourname.chatapp.chat.groupchat.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GroupMemberResponse {
    private Long id;
    private Long userId;
    private String username;
    private String displayName;
    private String profileImageUrl;
    private Boolean online;
    private LocalDateTime lastSeen;
    private String role;
    private LocalDateTime joinedAt;
}
