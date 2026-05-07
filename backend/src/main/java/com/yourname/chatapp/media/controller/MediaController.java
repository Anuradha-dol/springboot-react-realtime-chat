package com.yourname.chatapp.media.controller;

import com.yourname.chatapp.media.entity.MediaFile;
import com.yourname.chatapp.media.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/media", "/api/messages/media"})
@RequiredArgsConstructor
public class MediaController {
    private final MediaService mediaService;

    // Returns uploaded media metadata list.
    @GetMapping
    public ResponseEntity<List<MediaFile>> getAll() {
        return ResponseEntity.ok(mediaService.getAll());
    }
}
