package com.yourname.chatapp.chat.controller;

import com.yourname.chatapp.chat.dto.ChatRequest;
import com.yourname.chatapp.chat.entity.Chat;
import com.yourname.chatapp.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
public class ChatController {
    private final ChatService chatService;

    // Creates a chat room.
    @PostMapping
    public ResponseEntity<Chat> create(@RequestBody ChatRequest request) {
        return ResponseEntity.ok(chatService.create(request));
    }

    // Returns all chat rooms.
    @GetMapping
    public ResponseEntity<List<Chat>> getAll() {
        return ResponseEntity.ok(chatService.getAll());
    }
}
