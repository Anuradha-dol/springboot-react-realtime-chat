package com.yourname.chatapp.chat.groupchat.repository;

import com.yourname.chatapp.chat.groupchat.entity.GroupPollOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GroupPollOptionRepository extends JpaRepository<GroupPollOption, Long> {
    Optional<GroupPollOption> findByIdAndPollId(Long optionId, Long pollId);
}
