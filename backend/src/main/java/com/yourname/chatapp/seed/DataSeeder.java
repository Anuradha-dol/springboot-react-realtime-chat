package com.yourname.chatapp.seed;

import com.yourname.chatapp.chat.entity.Chat;
import com.yourname.chatapp.chat.repository.ChatRepository;
import com.yourname.chatapp.common.enums.ChatType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Slf4j
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private final ChatRepository chatRepository;

    @Override
    public void run(String... args) {
        if (chatRepository.findByName("General").isEmpty()) {
            Chat chat = Chat.builder()
                .name("General")
                .chatType(ChatType.GROUP)
                .createdAt(LocalDateTime.now())
                .build();
            chatRepository.save(chat);
            log.info("Seeded default chat room: General");
        }
        log.info("DataSeeder initialized.");
    }
}
