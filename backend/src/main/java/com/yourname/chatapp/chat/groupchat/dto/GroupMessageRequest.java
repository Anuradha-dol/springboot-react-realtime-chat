package com.yourname.chatapp.chat.groupchat.dto;

import com.yourname.chatapp.common.enums.MessageType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GroupMessageRequest {
    @NotNull(message = "Group id is required.")
    private Long groupId;

    private String content;

    private MessageType messageType = MessageType.TEXT;

    private String mediaUrl;

    private Long replyToMessageId;
}
