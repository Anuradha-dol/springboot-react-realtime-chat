package com.yourname.chatapp.message.entity;

import com.yourname.chatapp.common.enums.MessageStatus;
import com.yourname.chatapp.common.enums.MessageType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long chatId;
    private Long senderId;
    @Column(columnDefinition = "TEXT")
    private String content;
    @Enumerated(EnumType.STRING)
    private MessageType messageType;
    @Enumerated(EnumType.STRING)
    private MessageStatus status;
    private LocalDateTime createdAt;
}

