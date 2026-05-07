package com.yourname.chatapp.upload.controller;

import com.yourname.chatapp.chat.groupchat.service.GroupChatService;
import com.yourname.chatapp.chat.privatechat.service.PrivateChatService;
import com.yourname.chatapp.common.response.ApiResponse;
import com.yourname.chatapp.security.CurrentUserService;
import com.yourname.chatapp.upload.dto.UploadResponse;
import com.yourname.chatapp.upload.entity.StoredFile;
import com.yourname.chatapp.upload.service.FileUploadService;
import com.yourname.chatapp.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/api/uploads", "/api/files"})
@RequiredArgsConstructor
public class FileUploadController {
    private final FileUploadService fileUploadService;
    private final CurrentUserService currentUserService;
    private final PrivateChatService privateChatService;
    private final GroupChatService groupChatService;

    // Uploads chat image files.
    @PostMapping("/chat/image")
    public ResponseEntity<ApiResponse<UploadResponse>> uploadChatImage(@RequestParam("file") MultipartFile file) {
        User me = currentUserService.getCurrentUser();
        StoredFile storedFile = fileUploadService.uploadChatImage(file, me.getId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Image uploaded.", toResponse(storedFile)));
    }

    // Uploads chat video files.
    @PostMapping("/chat/video")
    public ResponseEntity<ApiResponse<UploadResponse>> uploadChatVideo(@RequestParam("file") MultipartFile file) {
        User me = currentUserService.getCurrentUser();
        StoredFile storedFile = fileUploadService.uploadChatVideo(file, me.getId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Video uploaded.", toResponse(storedFile)));
    }

    // Uploads group profile image files.
    @PostMapping("/group/image")
    public ResponseEntity<ApiResponse<UploadResponse>> uploadGroupImage(@RequestParam("file") MultipartFile file) {
        User me = currentUserService.getCurrentUser();
        StoredFile storedFile = fileUploadService.uploadGroupImage(file, me.getId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Group image uploaded.", toResponse(storedFile)));
    }

    // Returns private file stream if current user has permission.
    @GetMapping("/files/{fileId}")
    public ResponseEntity<Resource> getPrivateFile(@PathVariable Long fileId) {
        User me = currentUserService.getCurrentUser();
        StoredFile storedFile = fileUploadService.getById(fileId);

        if (Boolean.TRUE.equals(storedFile.getPublicAccess())) {
            throw new IllegalArgumentException("Use public URL for this file.");
        }

        boolean canAccess = privateChatService.canAccessMediaUrl(me.getId(), storedFile.getFileUrl())
            || groupChatService.canAccessMediaUrl(me.getId(), storedFile.getFileUrl())
            || storedFile.getUploadedByUserId().equals(me.getId());

        if (!canAccess) {
            throw new IllegalArgumentException("You do not have permission to access this file.");
        }

        Resource resource = fileUploadService.loadAsResource(storedFile);
        if (!resource.exists()) {
            throw new IllegalArgumentException("File not found in storage.");
        }

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            mediaType = MediaType.parseMediaType(storedFile.getContentType());
        } catch (Exception ignored) {
            // fallback content type
        }

        return ResponseEntity.ok()
            .contentType(mediaType)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + storedFile.getStoredFileName() + "\"")
            .body(resource);
    }

    private UploadResponse toResponse(StoredFile storedFile) {
        UploadResponse response = new UploadResponse();
        response.setFileId(storedFile.getId());
        response.setFileUrl(storedFile.getFileUrl());
        response.setContentType(storedFile.getContentType());
        response.setCategory(storedFile.getCategory());
        response.setSizeBytes(storedFile.getSizeBytes());
        return response;
    }
}
