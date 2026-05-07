package com.yourname.chatapp.upload.dto;

import com.yourname.chatapp.upload.enums.UploadCategory;
import lombok.Data;

@Data
public class UploadResponse {
    private Long fileId;
    private String fileUrl;
    private String contentType;
    private UploadCategory category;
    private long sizeBytes;
}
