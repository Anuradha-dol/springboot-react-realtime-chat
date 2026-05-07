package com.yourname.chatapp.websocket.service;

import com.yourname.chatapp.websocket.dto.MessageEvent;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class WebSocketService {
    public MessageEvent processIncomingMessage(MessageEvent event) {
        event.setTimestamp(LocalDateTime.now());
        return event;
    }
}

