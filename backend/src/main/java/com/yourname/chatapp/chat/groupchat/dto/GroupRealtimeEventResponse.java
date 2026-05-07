package com.yourname.chatapp.chat.groupchat.dto;

import lombok.Data;

@Data
public class GroupRealtimeEventResponse {
    private String type;
    private Long groupId;
    private GroupResponse group;
    private Long actorUserId;
    private Long targetUserId;
    private String message;
}
