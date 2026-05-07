package com.yourname.chatapp.chat.websocket.dto;

import lombok.Data;

@Data
public class TypingStatusEvent {
    private Long fromUserId;
    private String fromUsername;
    private Long targetUserId;
    private Long groupId;
    private Boolean typing;
}
