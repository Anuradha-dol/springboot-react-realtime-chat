package com.yourname.chatapp.auth.controller;

import com.yourname.chatapp.auth.dto.*;
import com.yourname.chatapp.auth.service.AuthService;
import com.yourname.chatapp.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @Value("${app.jwt.cookie-name:chatapp_token}")
    private String accessCookieName;

    @Value("${app.jwt.refresh-cookie-name:chatapp_refresh_token}")
    private String refreshCookieName;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long accessTokenExpirationMs;

    @Value("${app.jwt.refresh-expiration-ms:604800000}")
    private long refreshTokenExpirationMs;

    // Registers user and sends verification OTP email.
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Registration successful. Verify your email OTP.", response));
    }

    // Verifies email with OTP.
    @PostMapping("/verify-email-otp")
    public ResponseEntity<ApiResponse<Void>> verifyEmailOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyEmailOtp(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Email verified successfully.", null));
    }

    @PostMapping("/resend-email-otp")
    public ResponseEntity<ApiResponse<Void>> resendEmailOtp(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.resendEmailOtp(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "If account exists and is unverified, OTP has been sent.", null));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthService.AuthSession session = authService.login(request);
        return withSessionCookies(session, "Login successful.");
    }

    // Refreshes access token using HttpOnly refresh token cookie.
    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(HttpServletRequest request) {
        String refreshToken = readCookieValue(request, refreshCookieName);
        AuthService.AuthSession session = authService.refreshSession(refreshToken);
        return withSessionCookies(session, "Token refreshed.");
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, clearCookie(accessCookieName).toString())
            .header(HttpHeaders.SET_COOKIE, clearCookie(refreshCookieName).toString())
            .body(new ApiResponse<>(true, "Logged out.", null));
    }

    // Returns currently logged-in user summary.
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse>> me() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Current user loaded.", authService.me()));
    }

    @PostMapping("/forgot-password/request-otp")
    public ResponseEntity<ApiResponse<Void>> requestForgotPasswordOtp(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestForgotPasswordOtp(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "If this email exists, OTP has been sent.", null));
    }

    @PostMapping("/forgot-password/resend-otp")
    public ResponseEntity<ApiResponse<Void>> resendForgotPasswordOtp(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.resendForgotPasswordOtp(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "If this email exists, OTP has been sent.", null));
    }

    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<ApiResponse<Void>> verifyForgotPasswordOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyForgotPasswordOtp(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "OTP verified.", null));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<ApiResponse<Void>> resetForgotPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetForgotPassword(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Password reset successful.", null));
    }

    private ResponseEntity<ApiResponse<AuthResponse>> withSessionCookies(AuthService.AuthSession session, String message) {
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, accessCookie(session.accessToken()).toString())
            .header(HttpHeaders.SET_COOKIE, refreshCookie(session.refreshToken()).toString())
            .body(new ApiResponse<>(true, message, session.response()));
    }

    private ResponseCookie accessCookie(String token) {
        return ResponseCookie.from(accessCookieName, token)
            .httpOnly(true)
            .secure(false)
            .path("/")
            .maxAge(Math.max(1, accessTokenExpirationMs / 1000))
            .sameSite("Lax")
            .build();
    }

    private ResponseCookie refreshCookie(String token) {
        return ResponseCookie.from(refreshCookieName, token)
            .httpOnly(true)
            .secure(false)
            .path("/")
            .maxAge(Math.max(1, refreshTokenExpirationMs / 1000))
            .sameSite("Lax")
            .build();
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

    // Controller-side cookie read keeps refresh endpoint body-free.
    private String readCookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return "";
        for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                return cookie.getValue();
            }
        }
        return "";
    }
}
