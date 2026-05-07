package com.yourname.chatapp.chat.groupchat.repository;

import com.yourname.chatapp.chat.groupchat.entity.GroupMessageSeen;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupMessageSeenRepository extends JpaRepository<GroupMessageSeen, Long> {
    List<GroupMessageSeen> findByMessageIdIn(List<Long> messageIds);

    List<GroupMessageSeen> findByMessageId(Long messageId);

    boolean existsByMessageIdAndUserId(Long messageId, Long userId);

    void deleteAllByUserId(Long userId);

    void deleteAllByMessageId(Long messageId);
}
