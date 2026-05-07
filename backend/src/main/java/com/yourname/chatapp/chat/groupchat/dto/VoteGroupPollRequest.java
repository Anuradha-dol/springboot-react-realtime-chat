package com.yourname.chatapp.chat.groupchat.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VoteGroupPollRequest {
    @NotNull(message = "Poll option id is required.")
    private Long optionId;
}
