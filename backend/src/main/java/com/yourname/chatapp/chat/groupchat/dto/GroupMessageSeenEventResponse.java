package com.yourname.chatapp.chat.groupchat.dto;

import lombok.Data;

@Data
public class GroupMessageSeenEventResponse {
    private Long groupId;
    private Long messageId;
    private GroupMessageSeenByResponse seenBy;
}
