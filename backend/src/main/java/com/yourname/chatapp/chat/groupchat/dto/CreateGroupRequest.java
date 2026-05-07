package com.yourname.chatapp.chat.groupchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateGroupRequest {
    @NotBlank(message = "Group name is required.")
    @Size(max = 100, message = "Group name must be at most 100 characters.")
    private String groupName;

    @Size(max = 250, message = "Description must be at most 250 characters.")
    private String description;

    private String groupImageUrl;

    private List<Long> memberIds;
}
