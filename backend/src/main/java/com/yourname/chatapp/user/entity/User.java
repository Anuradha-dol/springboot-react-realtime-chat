package com.yourname.chatapp.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    private String password;
    // Role is stored as plain text to keep authorization checks simple.
    @Column
    private String role;
    @Column
    private Boolean emailVerified;
    @Column
    private Boolean deleted;
    private LocalDateTime deletedAt;
    private String firstName;
    private String lastName;
    private String displayName;
    private String phoneNumber;
    private String profileImageUrl;
    private String coverImageUrl;
    @Column(columnDefinition = "TEXT")
    private String bio;
    private Boolean online;
    private LocalDateTime lastSeen;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
        if (online == null) {
            online = false;
        }
        if (role == null || role.isBlank()) {
            role = "USER";
        }
        if (emailVerified == null) {
            emailVerified = false;
        }
        if (deleted == null) {
            deleted = false;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
