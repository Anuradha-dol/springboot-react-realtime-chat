package com.yourname.chatapp.auth.repository;

import com.yourname.chatapp.auth.entity.AuthOtpToken;
import com.yourname.chatapp.auth.entity.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface AuthOtpTokenRepository extends JpaRepository<AuthOtpToken, Long> {
    // Latest token is enough because we rotate OTP on resend.
    Optional<AuthOtpToken> findTopByUserIdAndPurposeOrderByCreatedAtDesc(Long userId, OtpPurpose purpose);

    Optional<AuthOtpToken> findTopByUserIdAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(Long userId, OtpPurpose purpose);

    long countByUserIdAndPurposeAndCreatedAtAfter(Long userId, OtpPurpose purpose, LocalDateTime createdAfter);
}
