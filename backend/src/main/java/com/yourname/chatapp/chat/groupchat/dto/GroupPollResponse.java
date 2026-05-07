package com.yourname.chatapp.chat.groupchat.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class GroupPollResponse {
    private Long id;
    private Long groupId;
    private Long messageId;
    private String question;
    private boolean anonymous;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private List<GroupPollOptionResponse> options;
    private long totalVotes;
}
