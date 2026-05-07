package com.yourname.chatapp.chat.groupchat.dto;

import lombok.Data;

@Data
public class GroupPollOptionResponse {
    private Long id;
    private String optionText;
    private long voteCount;
    private boolean votedByCurrentUser;
}
