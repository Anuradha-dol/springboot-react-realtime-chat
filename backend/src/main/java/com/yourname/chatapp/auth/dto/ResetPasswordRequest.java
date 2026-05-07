package com.yourname.chatapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    // Reset request includes OTP + new password.
    @Email(message = "Email is invalid.")
    @NotBlank(message = "Email is required.")
    private String email;

    @NotBlank(message = "OTP is required.")
    @Pattern(regexp = "^\\d{4,8}$", message = "OTP must be numeric.")
    private String otp;

    @NotBlank(message = "New password is required.")
    @Size(min = 6, message = "New password must be at least 6 characters.")
    private String newPassword;
}
