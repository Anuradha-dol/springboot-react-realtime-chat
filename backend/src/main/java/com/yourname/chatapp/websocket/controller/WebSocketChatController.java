package com.yourname.chatapp.websocket.controller;

import com.yourname.chatapp.websocket.dto.MessageEvent;
import com.yourname.chatapp.websocket.service.WebSocketService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class WebSocketChatController {
    private final WebSocketService webSocketService;

    // Broadcasts incoming legacy WebSocket message to /topic/messages.
    @MessageMapping("/chat.send")
    @SendTo("/topic/messages")
    public MessageEvent send(MessageEvent event) {
        return webSocketService.processIncomingMessage(event);
    }
}
