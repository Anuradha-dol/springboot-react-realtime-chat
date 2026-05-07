package com.yourname.chatapp.profile.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ProfileResponse {
    private Long id;
    private String username;
    private String firstName;
    private String lastName;
    private String displayName;
    private String email;
    private String phoneNumber;
    private String profileImageUrl;
    private String coverImageUrl;
    private String bio;
    private boolean online;
    private LocalDateTime lastSeen;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
