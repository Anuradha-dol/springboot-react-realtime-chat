package com.yourname.chatapp.chat.groupchat.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GroupMessageSeenByResponse {
    private Long userId;
    private String username;
    private String displayName;
    private String profileImageUrl;
    private LocalDateTime seenAt;
}
