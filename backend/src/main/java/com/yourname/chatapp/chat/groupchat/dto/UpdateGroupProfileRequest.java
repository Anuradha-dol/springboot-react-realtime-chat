package com.yourname.chatapp.chat.groupchat.dto;

import lombok.Data;

@Data
public class UpdateGroupProfileRequest {
    private String groupName;
    private String description;
    private String groupImageUrl;
}
