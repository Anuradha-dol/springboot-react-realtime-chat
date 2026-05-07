package com.yourname.chatapp.websocket.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageEvent {
    private Long chatId;
    private Long senderId;
    private String content;
    private LocalDateTime timestamp;
}

