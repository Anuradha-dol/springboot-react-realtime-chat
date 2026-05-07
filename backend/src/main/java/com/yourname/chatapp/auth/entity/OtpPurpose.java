package com.yourname.chatapp.auth.entity;

// OTP purpose separates email verification from password reset.
public enum OtpPurpose {
    EMAIL_VERIFICATION,
    FORGOT_PASSWORD
}
