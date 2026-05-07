package com.yourname.chatapp.profile.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeleteAccountRequest {
    @NotBlank(message = "Password confirmation is required.")
    private String password;
}
