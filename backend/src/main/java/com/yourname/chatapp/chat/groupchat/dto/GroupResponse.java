package com.yourname.chatapp.chat.groupchat.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class GroupResponse {
    private Long id;
    private String groupName;
    private String groupImageUrl;
    private String description;
    private Long createdById;
    private String createdByName;
    private String createdByProfileImageUrl;
    private long memberCount;
    private boolean currentUserAdmin;
    private String currentUserRole;
    private List<GroupMemberResponse> members;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private long messageCount;
    private long unreadCount;
    private LocalDateTime createdAt;
}
