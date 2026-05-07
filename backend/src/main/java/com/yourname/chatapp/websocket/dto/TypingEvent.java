package com.yourname.chatapp.websocket.dto;

import lombok.Data;

@Data
public class TypingEvent {
    private Long chatId;
    private String username;
    private boolean typing;
}

