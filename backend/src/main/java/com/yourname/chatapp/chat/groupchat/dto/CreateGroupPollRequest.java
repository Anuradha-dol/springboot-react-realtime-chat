package com.yourname.chatapp.chat.groupchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateGroupPollRequest {
    @NotNull(message = "Group id is required.")
    private Long groupId;

    @NotBlank(message = "Poll question is required.")
    private String question;

    @NotEmpty(message = "Poll options are required.")
    private List<@NotBlank(message = "Poll option cannot be empty.") String> options;

    private boolean anonymous = true;
}
