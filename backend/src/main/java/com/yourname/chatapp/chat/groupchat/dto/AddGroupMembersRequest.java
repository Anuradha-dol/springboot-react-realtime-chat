package com.yourname.chatapp.chat.groupchat.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class AddGroupMembersRequest {
    @NotEmpty(message = "At least one user id is required.")
    private List<Long> userIds;
}
