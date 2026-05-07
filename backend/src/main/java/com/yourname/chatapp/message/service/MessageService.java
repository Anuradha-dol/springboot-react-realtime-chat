package com.yourname.chatapp.message.service;

import com.yourname.chatapp.common.enums.MessageStatus;
import com.yourname.chatapp.message.dto.SendMessageRequest;
import com.yourname.chatapp.message.entity.Message;
import com.yourname.chatapp.message.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {
    private final MessageRepository messageRepository;

    public Message send(SendMessageRequest request) {
        Message message = Message.builder()
            .chatId(request.getChatId())
            .senderId(request.getSenderId())
            .content(request.getContent())
            .messageType(request.getMessageType())
            .status(MessageStatus.SENT)
            .createdAt(LocalDateTime.now())
            .build();
        return messageRepository.save(message);
    }

    public List<Message> getByChatId(Long chatId) {
        return messageRepository.findByChatId(chatId);
    }
}

