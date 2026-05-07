package com.yourname.chatapp.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public void sendEmailVerificationOtp(String email, String otp) {
        // Keep email body concise and clear for end users.
        send(email, "Verify your account", "Your email verification OTP is: " + otp + "\nIt expires in 10 minutes.");
    }

    public void sendForgotPasswordOtp(String email, String otp) {
        send(email, "Reset your password", "Your password reset OTP is: " + otp + "\nIt expires in 10 minutes.");
    }

    private void send(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (fromAddress != null && !fromAddress.isBlank()) {
                message.setFrom(fromAddress);
            }
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (MailException ex) {
            throw new IllegalStateException("Unable to send email right now. Please try again.");
        }
    }
}
