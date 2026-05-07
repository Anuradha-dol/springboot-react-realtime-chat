package com.yourname.chatapp.chat.privatechat.dto;

import com.yourname.chatapp.common.enums.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendPrivateMediaRequest {
    @NotNull(message = "Receiver id is required.")
    private Long receiverId;

    @NotNull(message = "Message type is required.")
    private MessageType messageType;

    @NotBlank(message = "Media URL is required.")
    private String mediaUrl;

    private String content;

    private Long replyToMessageId;
}
