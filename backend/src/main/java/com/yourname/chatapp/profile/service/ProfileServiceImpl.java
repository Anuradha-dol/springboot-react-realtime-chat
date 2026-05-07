package com.yourname.chatapp.profile.service;

import com.yourname.chatapp.profile.dto.ChangePasswordRequest;
import com.yourname.chatapp.profile.dto.DeleteAccountRequest;
import com.yourname.chatapp.profile.dto.ProfileResponse;
import com.yourname.chatapp.profile.dto.UpdateProfileRequest;
import com.yourname.chatapp.security.CurrentUserService;
import com.yourname.chatapp.upload.dto.UploadResponse;
import com.yourname.chatapp.upload.entity.StoredFile;
import com.yourname.chatapp.upload.repository.StoredFileRepository;
import com.yourname.chatapp.upload.service.FileUploadService;
import com.yourname.chatapp.user.entity.User;
import com.yourname.chatapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final FileUploadService fileUploadService;
    private final StoredFileRepository storedFileRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public ProfileResponse getMyProfile() {
        return toResponse(currentUserService.getCurrentUser());
    }

    @Override
    public ProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findByIdAndDeletedFalse(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found."));
        return toResponse(user);
    }

    @Override
    @Transactional
    public ProfileResponse updateMyProfile(UpdateProfileRequest request) {
        User me = currentUserService.getCurrentUser();

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            userRepository.findByEmailIgnoreCaseAndDeletedFalse(request.getEmail().trim())
                .filter(existing -> !existing.getId().equals(me.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Email already in use.");
                });
            me.setEmail(request.getEmail().trim());
        }

        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            userRepository.findByPhoneNumber(request.getPhoneNumber().trim())
                .filter(existing -> !existing.getId().equals(me.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Phone number already in use.");
                });
            me.setPhoneNumber(request.getPhoneNumber().trim());
        }

        if (request.getFirstName() != null) {
            me.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null) {
            me.setLastName(request.getLastName().trim());
        }
        if (request.getBio() != null) {
            me.setBio(request.getBio().trim());
        }

        me.setDisplayName(buildDisplayName(me.getFirstName(), me.getLastName(), me.getUsername(), me.getDisplayName()));
        return toResponse(userRepository.save(me));
    }

    @Override
    @Transactional
    public UploadResponse updateProfilePhoto(MultipartFile file) {
        User me = currentUserService.getCurrentUser();
        StoredFile storedFile = fileUploadService.uploadProfileImage(file, me.getId());
        me.setProfileImageUrl(storedFile.getFileUrl());
        userRepository.save(me);
        return toUploadResponse(storedFile);
    }

    @Override
    @Transactional
    public UploadResponse updateCoverPhoto(MultipartFile file) {
        User me = currentUserService.getCurrentUser();
        StoredFile storedFile = fileUploadService.uploadCoverImage(file, me.getId());
        me.setCoverImageUrl(storedFile.getFileUrl());
        userRepository.save(me);
        return toUploadResponse(storedFile);
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User me = currentUserService.getCurrentUser();
        if (!passwordEncoder.matches(request.getCurrentPassword(), me.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }
        if (passwordEncoder.matches(request.getNewPassword(), me.getPassword())) {
            throw new IllegalArgumentException("New password must be different from current password.");
        }
        me.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(me);
    }

    @Override
    @Transactional
    public void deleteMyAccount(DeleteAccountRequest request) {
        User me = currentUserService.getCurrentUser();
        if (!passwordEncoder.matches(request.getPassword(), me.getPassword())) {
            throw new IllegalArgumentException("Password confirmation failed.");
        }
        if (Boolean.TRUE.equals(me.getDeleted())) {
            throw new IllegalArgumentException("Account is already deleted.");
        }

        // Soft delete prevents foreign-key failures in existing relational data.
        String suffix = me.getId() + "_" + System.currentTimeMillis();
        me.setDeleted(true);
        me.setDeletedAt(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC));
        me.setEmailVerified(false);
        me.setOnline(false);
        me.setLastSeen(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC));
        me.setUsername("deleted_user_" + suffix);
        me.setEmail("deleted_" + suffix + "@deleted.local");
        me.setDisplayName("Deleted User");
        me.setFirstName(null);
        me.setLastName(null);
        me.setPhoneNumber(null);
        me.setBio(null);
        me.setPassword(passwordEncoder.encode("deleted-account-" + suffix));
        userRepository.save(me);
    }

    private ProfileResponse toResponse(User user) {
        ProfileResponse response = new ProfileResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setDisplayName(buildDisplayName(user.getFirstName(), user.getLastName(), user.getUsername(), user.getDisplayName()));
        response.setEmail(user.getEmail());
        response.setPhoneNumber(user.getPhoneNumber());
        response.setProfileImageUrl(user.getProfileImageUrl());
        response.setCoverImageUrl(user.getCoverImageUrl());
        response.setBio(user.getBio());
        response.setOnline(Boolean.TRUE.equals(user.getOnline()));
        response.setLastSeen(user.getLastSeen());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        return response;
    }

    private UploadResponse toUploadResponse(StoredFile storedFile) {
        UploadResponse response = new UploadResponse();
        response.setFileId(storedFile.getId());
        response.setFileUrl(storedFile.getFileUrl());
        response.setContentType(storedFile.getContentType());
        response.setCategory(storedFile.getCategory());
        response.setSizeBytes(storedFile.getSizeBytes());
        return response;
    }

    private String buildDisplayName(String firstName, String lastName, String username, String fallback) {
        String full = ((firstName == null ? "" : firstName.trim()) + " " + (lastName == null ? "" : lastName.trim())).trim();
        if (!full.isBlank()) {
            return full;
        }
        if (fallback != null && !fallback.isBlank()) {
            return fallback;
        }
        return username;
    }
}
