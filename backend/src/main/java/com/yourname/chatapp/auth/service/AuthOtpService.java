package com.yourname.chatapp.auth.service;

import com.yourname.chatapp.auth.entity.AuthOtpToken;
import com.yourname.chatapp.auth.entity.OtpPurpose;
import com.yourname.chatapp.auth.repository.AuthOtpTokenRepository;
import com.yourname.chatapp.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class AuthOtpService {
    private final AuthOtpTokenRepository authOtpTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.auth.otp.length:6}")
    private int otpLength;
    @Value("${app.auth.otp.expiry-minutes:10}")
    private int otpExpiryMinutes;
    @Value("${app.auth.otp.resend-cooldown-seconds:60}")
    private int resendCooldownSeconds;
    @Value("${app.auth.otp.max-resends:5}")
    private int maxResends;

    @Transactional
    public void issueEmailVerificationOtp(User user) {
        IssuedOtp issued = createToken(user, OtpPurpose.EMAIL_VERIFICATION, 0);
        sendOtp(user.getEmail(), OtpPurpose.EMAIL_VERIFICATION, issued.otpCode);
    }

    @Transactional
    public void resendEmailVerificationOtp(User user) {
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new IllegalArgumentException("Email is already verified.");
        }
        IssuedOtp issued = rotateOrCreateToken(user, OtpPurpose.EMAIL_VERIFICATION);
        sendOtp(user.getEmail(), OtpPurpose.EMAIL_VERIFICATION, issued.otpCode);
    }

    @Transactional
    public void issueForgotPasswordOtp(User user) {
        // Request and resend both enforce cooldown through shared rotation logic.
        IssuedOtp issued = rotateOrCreateToken(user, OtpPurpose.FORGOT_PASSWORD);
        sendOtp(user.getEmail(), OtpPurpose.FORGOT_PASSWORD, issued.otpCode);
    }

    @Transactional
    public void resendForgotPasswordOtp(User user) {
        IssuedOtp issued = rotateOrCreateToken(user, OtpPurpose.FORGOT_PASSWORD);
        sendOtp(user.getEmail(), OtpPurpose.FORGOT_PASSWORD, issued.otpCode);
    }

    @Transactional
    public void verifyOtp(User user, OtpPurpose purpose, String otpCode) {
        AuthOtpToken token = authOtpTokenRepository.findTopByUserIdAndPurposeOrderByCreatedAtDesc(user.getId(), purpose)
            .orElseThrow(() -> new IllegalArgumentException("OTP is invalid or expired."));
        verifyInternal(token, otpCode, true);
    }

    @Transactional(readOnly = true)
    public void ensureForgotPasswordOtpVerified(User user, String otpCode) {
        AuthOtpToken token = authOtpTokenRepository.findTopByUserIdAndPurposeOrderByCreatedAtDesc(user.getId(), OtpPurpose.FORGOT_PASSWORD)
            .orElseThrow(() -> new IllegalArgumentException("OTP is invalid or expired."));
        if (!Boolean.TRUE.equals(token.getVerified())) {
            throw new IllegalArgumentException("OTP must be verified first.");
        }
        verifyInternal(token, otpCode, false);
    }

    @Transactional
    public void invalidateForgotPasswordOtp(User user) {
        authOtpTokenRepository.findTopByUserIdAndPurposeOrderByCreatedAtDesc(user.getId(), OtpPurpose.FORGOT_PASSWORD)
            .ifPresent(token -> {
                token.setExpiresAt(nowUtc().minusSeconds(1));
                authOtpTokenRepository.save(token);
            });
    }

    private IssuedOtp rotateOrCreateToken(User user, OtpPurpose purpose) {
        LocalDateTime now = nowUtc();
        AuthOtpToken token = authOtpTokenRepository.findTopByUserIdAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(user.getId(), purpose)
            .orElse(null);

        if (token == null) {
            return createToken(user, purpose, 0);
        }

        if (token.getResendAvailableAt() != null && token.getResendAvailableAt().isAfter(now)) {
            long waitSeconds = Duration.between(now, token.getResendAvailableAt()).getSeconds();
            throw new IllegalArgumentException("Please wait " + Math.max(1, waitSeconds) + " seconds before resending OTP.");
        }

        if (token.getResendCount() != null && token.getResendCount() >= maxResends) {
            throw new IllegalArgumentException("OTP resend limit reached. Try again later.");
        }

        String otpCode = generateOtp();
        token.setOtpHash(passwordEncoder.encode(otpCode));
        token.setExpiresAt(now.plusMinutes(otpExpiryMinutes));
        token.setResendAvailableAt(now.plusSeconds(resendCooldownSeconds));
        token.setResendCount((token.getResendCount() == null ? 0 : token.getResendCount()) + 1);
        token.setVerified(false);
        token.setVerifiedAt(null);
        authOtpTokenRepository.save(token);
        return new IssuedOtp(token, otpCode);
    }

    private IssuedOtp createToken(User user, OtpPurpose purpose, int resendCount) {
        LocalDateTime now = nowUtc();
        String otpCode = generateOtp();
        AuthOtpToken token = AuthOtpToken.builder()
            .user(user)
            .purpose(purpose)
            .otpHash(passwordEncoder.encode(otpCode))
            .resendCount(resendCount)
            .verified(false)
            .expiresAt(now.plusMinutes(otpExpiryMinutes))
            .resendAvailableAt(now.plusSeconds(resendCooldownSeconds))
            .build();
        AuthOtpToken saved = authOtpTokenRepository.save(token);
        return new IssuedOtp(saved, otpCode);
    }

    private void sendOtp(String email, OtpPurpose purpose, String otpCode) {
        if (purpose == OtpPurpose.EMAIL_VERIFICATION) {
            emailService.sendEmailVerificationOtp(email, otpCode);
            return;
        }
        emailService.sendForgotPasswordOtp(email, otpCode);
    }

    private void verifyInternal(AuthOtpToken token, String otpCode, boolean markVerified) {
        LocalDateTime now = nowUtc();
        if (token.getExpiresAt() == null || token.getExpiresAt().isBefore(now)) {
            throw new IllegalArgumentException("OTP is expired.");
        }
        if (token.getOtpHash() == null || !passwordEncoder.matches(otpCode, token.getOtpHash())) {
            throw new IllegalArgumentException("OTP is invalid.");
        }
        if (markVerified && !Boolean.TRUE.equals(token.getVerified())) {
            token.setVerified(true);
            token.setVerifiedAt(now);
            authOtpTokenRepository.save(token);
        }
    }

    private String generateOtp() {
        int length = Math.max(4, Math.min(8, otpLength));
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append(secureRandom.nextInt(10));
        }
        return builder.toString();
    }

    private LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    // Internal transport keeps plain OTP only in memory for immediate email sending.
    private record IssuedOtp(AuthOtpToken token, String otpCode) {}
}
