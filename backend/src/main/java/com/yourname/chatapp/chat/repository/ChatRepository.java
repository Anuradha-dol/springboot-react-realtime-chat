package com.yourname.chatapp.chat.repository;

import com.yourname.chatapp.chat.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRepository extends JpaRepository<Chat, Long> {
}

