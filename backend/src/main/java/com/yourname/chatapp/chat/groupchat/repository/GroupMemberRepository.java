package com.yourname.chatapp.chat.groupchat.repository;

import com.yourname.chatapp.chat.groupchat.entity.GroupMember;
import com.yourname.chatapp.common.enums.GroupRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    List<GroupMember> findAllByUserId(Long userId);

    List<GroupMember> findAllByGroupChatId(Long groupId);

    Optional<GroupMember> findByGroupChatIdAndUserId(Long groupId, Long userId);

    boolean existsByGroupChatIdAndUserId(Long groupId, Long userId);

    long countByGroupChatIdAndRole(Long groupId, GroupRole role);

    Optional<GroupMember> findFirstByGroupChatIdOrderByJoinedAtAsc(Long groupId);

    void deleteAllByUserId(Long userId);

    void deleteAllByGroupChatId(Long groupId);
}
