package com.yourname.chatapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class VerifyOtpRequest {
    @Email(message = "Email is invalid.")
    @NotBlank(message = "Email is required.")
    private String email;

    // OTP is restricted to numeric digits for simple UX.
    @NotBlank(message = "OTP is required.")
    @Pattern(regexp = "^\\d{4,8}$", message = "OTP must be numeric.")
    private String otp;
}
