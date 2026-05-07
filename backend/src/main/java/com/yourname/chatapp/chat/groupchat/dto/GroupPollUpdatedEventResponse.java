package com.yourname.chatapp.chat.groupchat.dto;

import lombok.Data;

@Data
public class GroupPollUpdatedEventResponse {
    private Long groupId;
    private Long messageId;
    private GroupPollResponse poll;
}
