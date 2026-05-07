package com.yourname.chatapp.profile.service;

import com.yourname.chatapp.profile.dto.ChangePasswordRequest;
import com.yourname.chatapp.profile.dto.DeleteAccountRequest;
import com.yourname.chatapp.profile.dto.ProfileResponse;
import com.yourname.chatapp.profile.dto.UpdateProfileRequest;
import com.yourname.chatapp.upload.dto.UploadResponse;
import org.springframework.web.multipart.MultipartFile;

public interface ProfileService {
    ProfileResponse getMyProfile();

    ProfileResponse getUserProfile(Long userId);

    ProfileResponse updateMyProfile(UpdateProfileRequest request);

    UploadResponse updateProfilePhoto(MultipartFile file);

    UploadResponse updateCoverPhoto(MultipartFile file);

    void changePassword(ChangePasswordRequest request);

    void deleteMyAccount(DeleteAccountRequest request);
}
