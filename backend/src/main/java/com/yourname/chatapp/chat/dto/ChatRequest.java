package com.yourname.chatapp.chat.dto;

import com.yourname.chatapp.common.enums.ChatType;
import lombok.Data;

@Data
public class ChatRequest {
    private String name;
    private ChatType chatType;
}

