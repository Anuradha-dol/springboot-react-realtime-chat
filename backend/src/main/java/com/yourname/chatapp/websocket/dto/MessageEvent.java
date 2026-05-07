package com.yourname.chatapp.websocket.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageEvent {
    private Long id;
    private Long chatId;
    private Long senderId;
    private String senderName;
    private String content;
    private LocalDateTime createdAt;
}
