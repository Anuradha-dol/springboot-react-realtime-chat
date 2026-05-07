package com.yourname.chatapp.auth.service;

import com.yourname.chatapp.auth.dto.*;
import com.yourname.chatapp.auth.entity.OtpPurpose;
import com.yourname.chatapp.auth.security.JwtService;
import com.yourname.chatapp.security.CurrentUserService;
import com.yourname.chatapp.user.entity.User;
import com.yourname.chatapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthOtpService authOtpService;
    private final CurrentUserService currentUserService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase();
        String displayName = (request.getDisplayName() == null || request.getDisplayName().isBlank())
            ? username
            : request.getDisplayName().trim();

        if (userRepository.existsByUsernameIgnoreCaseAndDeletedFalse(username)) {
            throw new IllegalArgumentException("Username already exists.");
        }
        if (userRepository.existsByEmailIgnoreCaseAndDeletedFalse(email)) {
            throw new IllegalArgumentException("Email already exists.");
        }

        User user = User.builder()
            .username(username)
            .displayName(displayName)
            .email(email)
            .password(passwordEncoder.encode(request.getPassword()))
            .role("USER")
            .emailVerified(false)
            .deleted(false)
            .online(false)
            .build();

        User saved = userRepository.save(user);
        authOtpService.issueEmailVerificationOtp(saved);
        return buildAuthResponse(saved, null);
    }

    @Transactional
    public void verifyEmailOtp(VerifyOtpRequest request) {
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(request.getEmail().trim())
            .orElseThrow(() -> new IllegalArgumentException("OTP is invalid or expired."));
        authOtpService.verifyOtp(user, OtpPurpose.EMAIL_VERIFICATION, request.getOtp().trim());
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    @Transactional
    public void resendEmailOtp(ForgotPasswordRequest request) {
        userRepository.findByEmailIgnoreCaseAndDeletedFalse(request.getEmail().trim())
            .filter(user -> !Boolean.TRUE.equals(user.getEmailVerified()))
            .ifPresent(authOtpService::resendEmailVerificationOtp);
    }

    public AuthSession login(LoginRequest request) {
        User user = userRepository.findByUsernameIgnoreCaseAndDeletedFalse(request.getUsername().trim())
            .or(() -> userRepository.findByEmailIgnoreCaseAndDeletedFalse(request.getUsername().trim()))
            .orElseThrow(() -> new IllegalArgumentException("Invalid username or password."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid username or password.");
        }
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new IllegalArgumentException("Please verify your email before logging in.");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        return new AuthSession(buildAuthResponse(user, accessToken), accessToken, refreshToken);
    }

    public AuthSession refreshSession(String refreshToken) {
        if (!jwtService.isTokenValid(refreshToken) || !jwtService.isRefreshToken(refreshToken)) {
            throw new IllegalArgumentException("Invalid refresh token.");
        }
        String username = jwtService.extractUsername(refreshToken);
        User user = userRepository.findByUsernameIgnoreCaseAndDeletedFalse(username)
            .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token."));
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new IllegalArgumentException("Account is not verified.");
        }
        String accessToken = jwtService.generateAccessToken(user);
        String nextRefreshToken = jwtService.generateRefreshToken(user);
        return new AuthSession(buildAuthResponse(user, accessToken), accessToken, nextRefreshToken);
    }

    public AuthResponse me() {
        User user = currentUserService.getCurrentUser();
        return buildAuthResponse(user, null);
    }

    @Transactional
    public void requestForgotPasswordOtp(ForgotPasswordRequest request) {
        userRepository.findByEmailIgnoreCaseAndDeletedFalse(request.getEmail().trim())
            .ifPresent(user -> {
                try {
                    authOtpService.issueForgotPasswordOtp(user);
                } catch (IllegalArgumentException ignored) {
                    // Keep response generic to avoid email enumeration or timing hints.
                }
            });
    }

    @Transactional
    public void resendForgotPasswordOtp(ForgotPasswordRequest request) {
        userRepository.findByEmailIgnoreCaseAndDeletedFalse(request.getEmail().trim())
            .ifPresent(user -> {
                try {
                    authOtpService.resendForgotPasswordOtp(user);
                } catch (IllegalArgumentException ignored) {
                    // Keep response generic to avoid email enumeration or timing hints.
                }
            });
    }

    @Transactional
    public void verifyForgotPasswordOtp(VerifyOtpRequest request) {
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(request.getEmail().trim())
            .orElseThrow(() -> new IllegalArgumentException("OTP is invalid or expired."));
        authOtpService.verifyOtp(user, OtpPurpose.FORGOT_PASSWORD, request.getOtp().trim());
    }

    @Transactional
    public void resetForgotPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(request.getEmail().trim())
            .orElseThrow(() -> new IllegalArgumentException("OTP is invalid or expired."));

        authOtpService.ensureForgotPasswordOtpVerified(user, request.getOtp().trim());
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        userRepository.save(user);
        authOtpService.invalidateForgotPasswordOtp(user);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken) {
        return AuthResponse.builder()
            .token(accessToken)
            .userId(user.getId())
            .username(user.getUsername())
            .displayName(user.getDisplayName())
            .email(user.getEmail())
            .role(user.getRole() == null ? "USER" : user.getRole())
            .emailVerified(Boolean.TRUE.equals(user.getEmailVerified()))
            .build();
    }

    // Session model lets controller manage cookies without exposing refresh token in JSON.
    public record AuthSession(AuthResponse response, String accessToken, String refreshToken) {}
}
