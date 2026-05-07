package com.yourname.chatapp.chat.privatechat.entity;

import com.yourname.chatapp.common.enums.MessageType;
import com.yourname.chatapp.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(
    name = "private_messages",
    indexes = {
        @Index(name = "idx_private_messages_sender", columnList = "sender_id"),
        @Index(name = "idx_private_messages_receiver", columnList = "receiver_id"),
        @Index(name = "idx_private_messages_created_at", columnList = "createdAt")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrivateMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @Column(columnDefinition = "TEXT")
    private String content;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_message_id")
    private PrivateMessage replyToMessage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageType messageType;

    private String mediaUrl;

    @Column(nullable = false)
    private Boolean isRead;

    @Column(nullable = false)
    private Boolean senderDeleted;

    @Column(nullable = false)
    private Boolean receiverDeleted;

    @Column(nullable = false)
    private Boolean deletedForEveryone;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
        if (isRead == null) {
            isRead = false;
        }
        if (senderDeleted == null) {
            senderDeleted = false;
        }
        if (receiverDeleted == null) {
            receiverDeleted = false;
        }
        if (deletedForEveryone == null) {
            deletedForEveryone = false;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
