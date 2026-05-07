package com.yourname.chatapp.chat.websocket.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PresenceEvent {
    private Long userId;
    private String username;
    private boolean online;
    private LocalDateTime lastSeen;
}
