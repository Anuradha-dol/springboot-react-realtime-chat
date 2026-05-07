package com.yourname.chatapp.auth.service;

import com.yourname.chatapp.auth.dto.AuthResponse;
import com.yourname.chatapp.auth.dto.LoginRequest;
import com.yourname.chatapp.auth.dto.RegisterRequest;
import com.yourname.chatapp.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final JwtService jwtService;

    public AuthResponse login(LoginRequest request) {
        String token = jwtService.generateToken(request.getUsername());
        return new AuthResponse(token, request.getUsername());
    }

    public AuthResponse register(RegisterRequest request) {
        String token = jwtService.generateToken(request.getUsername());
        return new AuthResponse(token, request.getUsername());
    }
}

