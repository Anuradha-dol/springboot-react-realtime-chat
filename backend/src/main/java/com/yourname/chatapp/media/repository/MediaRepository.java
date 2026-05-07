package com.yourname.chatapp.media.repository;

import com.yourname.chatapp.media.entity.MediaFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MediaRepository extends JpaRepository<MediaFile, Long> {
    void deleteAllByUploaderId(Long uploaderId);
}
