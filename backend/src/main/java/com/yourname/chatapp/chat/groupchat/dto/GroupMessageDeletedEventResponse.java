package com.yourname.chatapp.chat.groupchat.dto;

import lombok.Data;

@Data
public class GroupMessageDeletedEventResponse {
    private Long groupId;
    private Long messageId;
    private Long deletedByUserId;
}
