package com.yourname.chatapp.chat.groupchat.repository;

import com.yourname.chatapp.chat.groupchat.entity.GroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupMessageRepository extends JpaRepository<GroupMessage, Long> {
    List<GroupMessage> findByGroupChatIdOrderByCreatedAtAsc(Long groupId);

    List<GroupMessage> findBySenderId(Long userId);

    List<GroupMessage> findByReplyToMessageIdIn(List<Long> messageIds);

    Optional<GroupMessage> findByIdAndGroupChatId(Long messageId, Long groupId);

    Optional<GroupMessage> findTopByGroupChatIdOrderByCreatedAtDesc(Long groupId);

    long countByGroupChatId(Long groupId);

    @Query("""
        select count(m) from GroupMessage m
        where m.groupChat.id = :groupId
          and m.sender.id <> :userId
          and not exists (
            select 1 from GroupMessageSeen seen
            where seen.message.id = m.id
              and seen.user.id = :userId
          )
        """)
    long countUnreadForUser(@Param("groupId") Long groupId, @Param("userId") Long userId);

    boolean existsByMediaUrlAndGroupChatIdIn(String mediaUrl, List<Long> groupIds);

    void deleteAllBySenderId(Long userId);

    void deleteAllByGroupChatId(Long groupId);
}
