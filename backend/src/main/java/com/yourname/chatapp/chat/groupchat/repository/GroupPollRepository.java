package com.yourname.chatapp.chat.groupchat.repository;

import com.yourname.chatapp.chat.groupchat.entity.GroupPoll;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupPollRepository extends JpaRepository<GroupPoll, Long> {
    Optional<GroupPoll> findByIdAndGroupChatId(Long pollId, Long groupId);

    Optional<GroupPoll> findByMessageId(Long messageId);

    List<GroupPoll> findByGroupChatIdOrderByCreatedAtDesc(Long groupId);
}
