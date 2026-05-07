package com.yourname.chatapp.chat.groupchat.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class MarkGroupMessagesSeenRequest {
    @NotEmpty(message = "Message ids are required.")
    private List<@NotNull(message = "Message id is required.") Long> messageIds;
}
