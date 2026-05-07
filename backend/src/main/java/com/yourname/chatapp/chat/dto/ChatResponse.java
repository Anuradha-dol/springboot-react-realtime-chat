package com.yourname.chatapp.chat.dto;

import com.yourname.chatapp.common.enums.ChatType;
import lombok.Data;

@Data
public class ChatResponse {
    private Long id;
    private String name;
    private ChatType chatType;
}

