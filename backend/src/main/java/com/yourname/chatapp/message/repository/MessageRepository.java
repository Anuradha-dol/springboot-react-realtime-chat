package com.yourname.chatapp.message.repository;

import com.yourname.chatapp.message.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByChatIdOrderByCreatedAtAsc(Long chatId);

    void deleteAllBySenderId(Long senderId);
}
