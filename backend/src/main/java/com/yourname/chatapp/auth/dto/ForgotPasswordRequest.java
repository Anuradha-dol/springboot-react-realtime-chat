package com.yourname.chatapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    // Email is the only required input for OTP requests.
    @Email(message = "Email is invalid.")
    @NotBlank(message = "Email is required.")
    private String email;
}
