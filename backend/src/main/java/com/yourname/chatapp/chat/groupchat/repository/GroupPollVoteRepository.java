package com.yourname.chatapp.chat.groupchat.repository;

import com.yourname.chatapp.chat.groupchat.entity.GroupPollVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupPollVoteRepository extends JpaRepository<GroupPollVote, Long> {
    Optional<GroupPollVote> findByPollIdAndUserId(Long pollId, Long userId);

    List<GroupPollVote> findByPollId(Long pollId);

    void deleteAllByUserId(Long userId);
}
