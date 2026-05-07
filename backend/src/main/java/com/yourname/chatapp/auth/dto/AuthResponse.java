package com.yourname.chatapp.auth.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    // Token is access token only; refresh token stays in HttpOnly cookie.
    private String token;
    private Long userId;
    private String username;
    private String displayName;
    private String email;
    private String role;
    private Boolean emailVerified;
}
