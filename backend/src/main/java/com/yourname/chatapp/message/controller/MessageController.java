package com.yourname.chatapp.message.controller;

import com.yourname.chatapp.message.dto.MessageResponse;
import com.yourname.chatapp.message.dto.SendMessageRequest;
import com.yourname.chatapp.message.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/messages", "/api/chats/messages"})
@RequiredArgsConstructor
public class MessageController {
    private final MessageService messageService;

    // Sends a legacy chat-room message.
    @PostMapping
    public ResponseEntity<MessageResponse> send(@RequestBody SendMessageRequest request) {
        return ResponseEntity.ok(messageService.send(request));
    }

    // Gets messages for one chat room.
    @GetMapping({"/chat/{chatId}", "/{chatId}"})
    public ResponseEntity<List<MessageResponse>> getByChat(@PathVariable Long chatId) {
        return ResponseEntity.ok(messageService.getByChatId(chatId));
    }

    // Deletes one message by id.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }
}
