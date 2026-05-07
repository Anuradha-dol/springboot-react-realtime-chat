package com.yourname.chatapp.chat.privatechat.dto;

import com.yourname.chatapp.common.enums.MessageType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PrivateMessageResponse {
    private Long id;
    private Long senderId;
    private String senderName;
    private Long receiverId;
    private String receiverName;
    private String content;
    private MessageType messageType;
    private String mediaUrl;
    private Long replyToMessageId;
    private Long replyToSenderId;
    private String replyToSenderName;
    private MessageType replyToMessageType;
    private String replyToContent;
    private Boolean read;
    private Boolean mine;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
