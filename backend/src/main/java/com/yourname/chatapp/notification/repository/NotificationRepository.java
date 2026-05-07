package com.yourname.chatapp.notification.repository;

import com.yourname.chatapp.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
}

