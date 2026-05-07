package com.yourname.chatapp.media.service;

import com.yourname.chatapp.media.entity.MediaFile;
import com.yourname.chatapp.media.repository.MediaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MediaService {
    private final MediaRepository mediaRepository;

    public List<MediaFile> getAll() {
        return mediaRepository.findAll();
    }
}

