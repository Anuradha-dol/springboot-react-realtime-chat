package com.yourname.chatapp.user.service;

import com.yourname.chatapp.user.dto.UpdateProfileRequest;
import com.yourname.chatapp.user.dto.UserResponse;
import com.yourname.chatapp.user.entity.User;
import com.yourname.chatapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
            .stream()
            .filter(user -> !Boolean.TRUE.equals(user.getDeleted()))
            .map(this::toUserResponse)
            .collect(Collectors.toList());
    }

    public UserResponse getUserById(Long id) {
        return userRepository.findByIdAndDeletedFalse(id).map(this::toUserResponse).orElse(null);
    }

    public List<UserResponse> searchUsers(String query) {
        if (query == null || query.isBlank()) {
            return getAllUsers();
        }
        return userRepository.searchUsers(query.trim())
            .stream()
            .map(this::toUserResponse)
            .collect(Collectors.toList());
    }

    public UserResponse updateProfile(Long id, UpdateProfileRequest request) {
        // Legacy update endpoint remains available for compatibility.
        User user = userRepository.findByIdAndDeletedFalse(id).orElse(null);
        if (user == null) return null;
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setDisplayName(request.getDisplayName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setProfileImageUrl(request.getProfileImageUrl());
        user.setCoverImageUrl(request.getCoverImageUrl());
        user.setBio(request.getBio());
        return toUserResponse(userRepository.save(user));
    }

    private UserResponse toUserResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setPhoneNumber(user.getPhoneNumber());
        response.setEmail(user.getEmail());
        response.setDisplayName(user.getDisplayName());
        response.setProfileImageUrl(user.getProfileImageUrl());
        response.setCoverImageUrl(user.getCoverImageUrl());
        response.setBio(user.getBio());
        response.setOnline(Boolean.TRUE.equals(user.getOnline()));
        response.setLastSeen(user.getLastSeen());
        return response;
    }
}
