package com.yourname.chatapp.user.service;

import com.yourname.chatapp.user.dto.UpdateProfileRequest;
import com.yourname.chatapp.user.entity.User;
import com.yourname.chatapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    public User updateProfile(Long id, UpdateProfileRequest request) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return null;
        user.setDisplayName(request.getDisplayName());
        user.setProfileImageUrl(request.getProfileImageUrl());
        return userRepository.save(user);
    }
}

