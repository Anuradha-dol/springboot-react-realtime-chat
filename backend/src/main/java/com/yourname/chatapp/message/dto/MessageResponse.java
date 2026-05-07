package com.yourname.chatapp.message.dto;

import com.yourname.chatapp.common.enums.MessageStatus;
import com.yourname.chatapp.common.enums.MessageType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageResponse {
    private Long id;
    private Long chatId;
    private Long senderId;
    private String senderName;
    private String content;
    private MessageType messageType;
    private MessageStatus status;
    private LocalDateTime createdAt;
}
