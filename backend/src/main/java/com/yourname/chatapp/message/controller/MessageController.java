package com.yourname.chatapp.message.controller;

import com.yourname.chatapp.message.dto.SendMessageRequest;
import com.yourname.chatapp.message.entity.Message;
import com.yourname.chatapp.message.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {
    private final MessageService messageService;

    @PostMapping
    public ResponseEntity<Message> send(@RequestBody SendMessageRequest request) {
        return ResponseEntity.ok(messageService.send(request));
    }

    @GetMapping("/chat/{chatId}")
    public ResponseEntity<List<Message>> getByChat(@PathVariable Long chatId) {
        return ResponseEntity.ok(messageService.getByChatId(chatId));
    }
}

