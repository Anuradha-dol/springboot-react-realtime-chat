package com.yourname.chatapp.chat.groupchat.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "group_poll_options")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupPollOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "poll_id", nullable = false)
    private GroupPoll poll;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String optionText;
}
