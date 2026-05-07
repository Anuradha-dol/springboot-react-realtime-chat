package com.yourname.chatapp.chat.groupchat.entity;

import com.yourname.chatapp.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(
    name = "group_message_seen",
    uniqueConstraints = @UniqueConstraint(name = "uk_group_message_seen_user", columnNames = {"message_id", "user_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMessageSeen {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private GroupMessage message;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDateTime seenAt;

    @PrePersist
    void onCreate() {
        seenAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
