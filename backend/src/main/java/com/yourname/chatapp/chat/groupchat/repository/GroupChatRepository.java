package com.yourname.chatapp.chat.groupchat.repository;

import com.yourname.chatapp.chat.groupchat.entity.GroupChat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupChatRepository extends JpaRepository<GroupChat, Long> {
    List<GroupChat> findAllByCreatedById(Long createdById);
}
