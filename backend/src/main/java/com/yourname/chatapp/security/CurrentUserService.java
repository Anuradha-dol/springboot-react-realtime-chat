package com.yourname.chatapp.security;

import com.yourname.chatapp.common.exception.ResourceNotFoundException;
import com.yourname.chatapp.user.entity.User;
import com.yourname.chatapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CurrentUserService {
    private final UserRepository userRepository;

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            throw new IllegalArgumentException("Unauthorized request.");
        }

        String username = authentication.getName();
        // Current user must remain active.
        return userRepository.findByUsernameIgnoreCaseAndDeletedFalse(username)
            .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));
    }
}
