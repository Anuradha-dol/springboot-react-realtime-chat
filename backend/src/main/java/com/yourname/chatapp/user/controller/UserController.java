package com.yourname.chatapp.user.controller;

import com.yourname.chatapp.common.response.ApiResponse;
import com.yourname.chatapp.profile.dto.DeleteAccountRequest;
import com.yourname.chatapp.profile.dto.ProfileResponse;
import com.yourname.chatapp.profile.service.ProfileService;
import com.yourname.chatapp.user.dto.UpdateProfileRequest;
import com.yourname.chatapp.user.dto.UserResponse;
import com.yourname.chatapp.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final ProfileService profileService;

    @Value("${app.jwt.cookie-name:chatapp_token}")
    private String accessCookieName;

    @Value("${app.jwt.refresh-cookie-name:chatapp_refresh_token}")
    private String refreshCookieName;

    // Professional /users/me endpoints are added without removing existing APIs.
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ProfileResponse>> getMe() {
        return ResponseEntity.ok(new ApiResponse<>(true, "User loaded.", profileService.getMyProfile()));
    }

    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<ProfileResponse>> patchMe(
        @Valid @RequestBody com.yourname.chatapp.profile.dto.UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(true, "User updated.", profileService.updateMyProfile(request)));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteMe(@Valid @RequestBody DeleteAccountRequest request) {
        profileService.deleteMyAccount(request);
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, clearCookie(accessCookieName).toString())
            .header(HttpHeaders.SET_COOKIE, clearCookie(refreshCookieName).toString())
            .body(new ApiResponse<>(true, "Account deleted.", null));
    }

    // Lists users, with optional search query.
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers(@RequestParam(required = false) String q) {
        if (q != null && !q.isBlank()) {
            return ResponseEntity.ok(userService.searchUsers(q));
        }
        return ResponseEntity.ok(userService.getAllUsers());
    }

    // Returns one user by id.
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        UserResponse user = userService.getUserById(id);
        return user == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(user);
    }

    // Legacy endpoint for direct user profile updates.
    @PutMapping("/{id}/profile")
    public ResponseEntity<UserResponse> updateProfile(@PathVariable Long id, @RequestBody UpdateProfileRequest request) {
        UserResponse user = userService.updateProfile(id, request);
        return user == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(user);
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
