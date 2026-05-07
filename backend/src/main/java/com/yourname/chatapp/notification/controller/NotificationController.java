package com.yourname.chatapp.notification.controller;

import com.yourname.chatapp.notification.entity.Notification;
import com.yourname.chatapp.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/notifications", "/api/users/me/notifications"})
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    // Returns notifications for current user context/service logic.
    @GetMapping
    public ResponseEntity<List<Notification>> getAll() {
        return ResponseEntity.ok(notificationService.getAll());
    }
}
