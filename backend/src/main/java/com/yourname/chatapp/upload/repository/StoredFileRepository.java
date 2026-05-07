package com.yourname.chatapp.upload.repository;

import com.yourname.chatapp.upload.entity.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {
    List<StoredFile> findAllByUploadedByUserId(Long userId);
}
