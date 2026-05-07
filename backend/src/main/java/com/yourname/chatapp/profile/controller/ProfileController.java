package com.yourname.chatapp.profile.controller;

import com.yourname.chatapp.common.response.ApiResponse;
import com.yourname.chatapp.profile.dto.ChangePasswordRequest;
import com.yourname.chatapp.profile.dto.DeleteAccountRequest;
import com.yourname.chatapp.profile.dto.ProfileResponse;
import com.yourname.chatapp.profile.dto.UpdateProfileRequest;
import com.yourname.chatapp.profile.service.ProfileService;
import com.yourname.chatapp.upload.dto.UploadResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/api/profile", "/api/users/profile"})
@RequiredArgsConstructor
public class ProfileController {
    private final ProfileService profileService;

    @Value("${app.jwt.cookie-name:chatapp_token}")
    private String accessCookieName;

    @Value("${app.jwt.refresh-cookie-name:chatapp_refresh_token}")
    private String refreshCookieName;

    // Returns logged-in user profile.
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ProfileResponse>> getMyProfile() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Profile loaded.", profileService.getMyProfile()));
    }

    // Returns public profile by user id.
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<ProfileResponse>> getUserProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Profile loaded.", profileService.getUserProfile(userId)));
    }

    // Updates logged-in user profile fields.
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<ProfileResponse>> updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Profile updated.", profileService.updateMyProfile(request)));
    }

    // Uploads logged-in user profile photo.
    @PostMapping("/me/profile-photo")
    public ResponseEntity<ApiResponse<UploadResponse>> updateProfilePhoto(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Profile photo updated.", profileService.updateProfilePhoto(file)));
    }

    // Uploads logged-in user cover photo.
    @PostMapping("/me/cover-photo")
    public ResponseEntity<ApiResponse<UploadResponse>> updateCoverPhoto(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Cover photo updated.", profileService.updateCoverPhoto(file)));
    }

    // Changes logged-in user password.
    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        profileService.changePassword(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Password changed.", null));
    }

    // Deletes logged-in user account (legacy path kept).
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteMyAccount(@Valid @RequestBody DeleteAccountRequest request) {
        profileService.deleteMyAccount(request);
        // Clear auth cookies after account removal.
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, clearCookie(accessCookieName).toString())
            .header(HttpHeaders.SET_COOKIE, clearCookie(refreshCookieName).toString())
            .body(new ApiResponse<>(true, "Account deleted.", null));
    }

    private ResponseCookie clearCookie(String cookieName) {
        return ResponseCookie.from(cookieName, "")
            .httpOnly(true)
            .secure(false)
            .path("/")
            .maxAge(0)
            .sameSite("Lax")
            .build();
    }
}
