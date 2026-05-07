package com.yourname.chatapp.chat.groupchat.config;

import com.yourname.chatapp.common.enums.MessageType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class GroupMessageTypeConstraintRepair implements CommandLineRunner {
    private static final String TABLE_NAME = "group_messages";
    private static final String CONSTRAINT_NAME = "group_messages_message_type_check";

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        String allowedValues = Arrays.stream(MessageType.values())
            .map(MessageType::name)
            .map(value -> "'" + value + "'")
            .collect(Collectors.joining(", "));

        String dropConstraintSql =
            "ALTER TABLE " + TABLE_NAME + " DROP CONSTRAINT IF EXISTS " + CONSTRAINT_NAME;
        String addConstraintSql =
            "ALTER TABLE " + TABLE_NAME + " ADD CONSTRAINT " + CONSTRAINT_NAME
                + " CHECK (message_type IN (" + allowedValues + "))";

        try {
            jdbcTemplate.execute(dropConstraintSql);
            jdbcTemplate.execute(addConstraintSql);
            log.info("Updated {} with allowed message types: {}", CONSTRAINT_NAME, allowedValues);
        } catch (Exception ex) {
            log.error("Failed to update {} on table {}.", CONSTRAINT_NAME, TABLE_NAME, ex);
            throw ex;
        }
    }
}
