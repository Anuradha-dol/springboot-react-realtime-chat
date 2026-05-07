package com.yourname.chatapp.message.dto;

import com.yourname.chatapp.common.enums.MessageType;
import lombok.Data;

@Data
public class SendMessageRequest {
    private Long chatId;
    private Long senderId;
    private String content;
    private MessageType messageType;
}

