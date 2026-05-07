package com.yourname.chatapp.seed;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class DataSeeder implements CommandLineRunner {
    @Override
    public void run(String... args) {
        log.info("DataSeeder initialized.");
    }
}

