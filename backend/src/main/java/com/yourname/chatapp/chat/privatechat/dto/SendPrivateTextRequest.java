package com.yourname.chatapp.chat.privatechat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SendPrivateTextRequest {
    @NotNull(message = "Receiver id is required.")
    private Long receiverId;

    @NotBlank(message = "Message content is required.")
    @Size(max = 5000, message = "Message content must be at most 5000 characters.")
    private String content;

    private Long replyToMessageId;
}
