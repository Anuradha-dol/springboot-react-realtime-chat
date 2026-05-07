package com.yourname.chatapp.user.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String displayName;
    private String profileImageUrl;
}

