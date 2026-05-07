package com.yourname.chatapp.profile.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(max = 50, message = "First name must be at most 50 characters.")
    private String firstName;

    @Size(max = 50, message = "Last name must be at most 50 characters.")
    private String lastName;

    @Email(message = "Email is invalid.")
    private String email;

    @Size(max = 20, message = "Phone number must be at most 20 characters.")
    private String phoneNumber;

    @Size(max = 250, message = "Bio must be at most 250 characters.")
    private String bio;
}
