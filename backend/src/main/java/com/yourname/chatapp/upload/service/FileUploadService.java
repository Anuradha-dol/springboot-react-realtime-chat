package com.yourname.chatapp.upload.service;

import com.yourname.chatapp.common.exception.ResourceNotFoundException;
import com.yourname.chatapp.upload.entity.StoredFile;
import com.yourname.chatapp.upload.enums.UploadCategory;
import com.yourname.chatapp.upload.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileUploadService {
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "webm", "mov");

    private final StoredFileRepository storedFileRepository;

    @Value("${app.upload.base-dir:uploads}")
    private String baseDir;

    @Value("${app.upload.max-image-size-bytes:5242880}")
    private long maxImageSizeBytes;

    @Value("${app.upload.max-video-size-bytes:26214400}")
    private long maxVideoSizeBytes;

    public StoredFile uploadProfileImage(MultipartFile file, Long uploaderId) {
        return save(file, uploaderId, UploadCategory.PROFILE);
    }

    public StoredFile uploadCoverImage(MultipartFile file, Long uploaderId) {
        return save(file, uploaderId, UploadCategory.COVER);
    }

    public StoredFile uploadGroupImage(MultipartFile file, Long uploaderId) {
        return save(file, uploaderId, UploadCategory.GROUP);
    }

    public StoredFile uploadChatImage(MultipartFile file, Long uploaderId) {
        return save(file, uploaderId, UploadCategory.CHAT_IMAGE);
    }

    public StoredFile uploadChatVideo(MultipartFile file, Long uploaderId) {
        return save(file, uploaderId, UploadCategory.CHAT_VIDEO);
    }

    public StoredFile getById(Long fileId) {
        return storedFileRepository.findById(fileId)
            .orElseThrow(() -> new ResourceNotFoundException("File not found: " + fileId));
    }

    public Resource loadAsResource(StoredFile storedFile) {
        return new FileSystemResource(Paths.get(storedFile.getFilePath()));
    }

    public void deleteStoredFile(StoredFile storedFile) {
        try {
            Files.deleteIfExists(Paths.get(storedFile.getFilePath()));
        } catch (IOException ignored) {
            // intentionally ignored: db cleanup should not fail if local file is already missing
        }
        storedFileRepository.delete(storedFile);
    }

    private StoredFile save(MultipartFile file, Long uploaderId, UploadCategory category) {
        validateFile(file, category);

        String extension = extractExtension(file.getOriginalFilename());
        String fileName = UUID.randomUUID() + "." + extension;
        Path targetDir = Paths.get(baseDir, category.getFolder());
        Path targetFile = targetDir.resolve(fileName).normalize();

        try {
            Files.createDirectories(targetDir);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new IllegalArgumentException("Failed to store file.");
        }

        StoredFile storedFile = StoredFile.builder()
            .uploadedByUserId(uploaderId)
            .originalFileName(file.getOriginalFilename() == null ? fileName : file.getOriginalFilename())
            .storedFileName(fileName)
            .filePath(targetFile.toAbsolutePath().toString())
            .contentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType())
            .sizeBytes(file.getSize())
            .category(category)
            .publicAccess(category.isPublicAccess())
            .fileUrl(buildTempUrl(category, fileName))
            .build();

        StoredFile saved = storedFileRepository.save(storedFile);
        String finalUrl = category.isPublicAccess()
            ? buildPublicUrl(category, fileName)
            : "/api/uploads/files/" + saved.getId();
        saved.setFileUrl(finalUrl);
        return storedFileRepository.save(saved);
    }

    private String buildTempUrl(UploadCategory category, String fileName) {
        if (category.isPublicAccess()) {
            return buildPublicUrl(category, fileName);
        }
        return "";
    }

    private String buildPublicUrl(UploadCategory category, String fileName) {
        return "/uploads/" + category.getFolder().replace("\\", "/") + "/" + fileName;
    }

    private void validateFile(MultipartFile file, UploadCategory category) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }
        String extension = extractExtension(file.getOriginalFilename());
        if (extension.isBlank()) {
            throw new IllegalArgumentException("Invalid file name.");
        }

        switch (category) {
            case PROFILE, COVER, CHAT_IMAGE, GROUP -> {
                if (!IMAGE_EXTENSIONS.contains(extension)) {
                    throw new IllegalArgumentException("Only jpg, jpeg, png, webp image files are allowed.");
                }
                if (file.getSize() > maxImageSizeBytes) {
                    throw new IllegalArgumentException("Image size exceeds max allowed size.");
                }
            }
            case CHAT_VIDEO -> {
                if (!VIDEO_EXTENSIONS.contains(extension)) {
                    throw new IllegalArgumentException("Only mp4, webm, mov video files are allowed.");
                }
                if (file.getSize() > maxVideoSizeBytes) {
                    throw new IllegalArgumentException("Video size exceeds max allowed size.");
                }
            }
            default -> throw new IllegalArgumentException("Unsupported upload category.");
        }
    }

    private String extractExtension(String fileName) {
        if (fileName == null) {
            return "";
        }
        int index = fileName.lastIndexOf('.');
        if (index < 0 || index == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(index + 1).toLowerCase();
    }
}
