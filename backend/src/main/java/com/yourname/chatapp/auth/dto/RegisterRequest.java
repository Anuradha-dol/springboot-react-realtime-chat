package com.yourname.chatapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    // Username is kept short and human-readable for mentions/chat.
    @NotBlank(message = "Username is required.")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters.")
    private String username;
    private String displayName;
    @Email(message = "Email is invalid.")
    @NotBlank(message = "Email is required.")
    private String email;
    @Size(min = 6, message = "Password must be at least 6 characters.")
    private String password;
}
