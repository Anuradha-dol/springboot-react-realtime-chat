package com.yourname.chatapp.websocket.service;

import com.yourname.chatapp.message.dto.MessageResponse;
import com.yourname.chatapp.message.dto.SendMessageRequest;
import com.yourname.chatapp.message.service.MessageService;
import com.yourname.chatapp.websocket.dto.MessageEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebSocketService {
    private final MessageService messageService;

    public MessageEvent processIncomingMessage(MessageEvent event) {
        SendMessageRequest request = new SendMessageRequest();
        request.setChatId(event.getChatId() == null ? 1L : event.getChatId());
        request.setSenderId(event.getSenderId());
        request.setContent(event.getContent());

        MessageResponse saved = messageService.send(request);

        MessageEvent outgoing = new MessageEvent();
        outgoing.setId(saved.getId());
        outgoing.setChatId(saved.getChatId());
        outgoing.setSenderId(saved.getSenderId());
        outgoing.setSenderName(saved.getSenderName());
        outgoing.setContent(saved.getContent());
        outgoing.setCreatedAt(saved.getCreatedAt());
        return outgoing;
    }
}
