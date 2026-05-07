package com.yourname.chatapp.notification.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NotificationResponse {
    private Long id;
    private Long userId;
    private String message;
    private boolean read;
    private LocalDateTime createdAt;
}

