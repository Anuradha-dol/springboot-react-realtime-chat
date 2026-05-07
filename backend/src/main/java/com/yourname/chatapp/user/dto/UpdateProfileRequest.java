package com.yourname.chatapp.user.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String firstName;
    private String lastName;
    private String displayName;
    private String phoneNumber;
    private String profileImageUrl;
    private String coverImageUrl;
    private String bio;
}
