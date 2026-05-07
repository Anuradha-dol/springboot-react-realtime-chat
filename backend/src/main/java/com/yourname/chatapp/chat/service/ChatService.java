package com.yourname.chatapp.chat.service;

import com.yourname.chatapp.chat.dto.ChatRequest;
import com.yourname.chatapp.chat.entity.Chat;
import com.yourname.chatapp.chat.repository.ChatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {
    private final ChatRepository chatRepository;

    public Chat create(ChatRequest request) {
        Chat chat = Chat.builder()
            .name(request.getName())
            .chatType(request.getChatType())
            .createdAt(LocalDateTime.now())
            .build();
        return chatRepository.save(chat);
    }

    public List<Chat> getAll() {
        return chatRepository.findAll();
    }
}

