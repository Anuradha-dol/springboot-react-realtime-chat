package com.yourname.chatapp.user.dto;

import lombok.Data;

@Data
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String displayName;
    private String profileImageUrl;
}

