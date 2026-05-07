package com.yourname.chatapp.websocket.dto;

import lombok.Data;

@Data
public class OnlineStatusEvent {
    private Long userId;
    private boolean online;
}

