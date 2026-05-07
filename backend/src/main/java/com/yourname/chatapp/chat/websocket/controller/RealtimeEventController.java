package com.yourname.chatapp.chat.websocket.controller;

import com.yourname.chatapp.chat.websocket.dto.TypingStatusEvent;
import com.yourname.chatapp.chat.websocket.service.ChatRealtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class RealtimeEventController {
    private final ChatRealtimeService chatRealtimeService;

    // Handles private typing indicator events.
    @MessageMapping("/typing/private")
    public void privateTyping(TypingStatusEvent event, Principal principal) {
        if (principal == null) {
            return;
        }
        chatRealtimeService.publishPrivateTyping(event, principal.getName());
    }

    // Handles group typing indicator events.
    @MessageMapping("/typing/group")
    public void groupTyping(TypingStatusEvent event, Principal principal) {
        if (principal == null) {
            return;
        }
        chatRealtimeService.publishGroupTyping(event, principal.getName());
    }
}
