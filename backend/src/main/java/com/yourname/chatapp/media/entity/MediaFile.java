package com.yourname.chatapp.media.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "media_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long uploaderId;
    private String fileName;
    private String fileUrl;
    private String contentType;
    private LocalDateTime uploadedAt;
}

