package com.yourname.chatapp.auth.security;

import com.yourname.chatapp.user.entity.User;
import com.yourname.chatapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Security context should only load non-deleted users.
        User user = userRepository.findByUsernameIgnoreCaseAndDeletedFalse(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return org.springframework.security.core.userdetails.User
            .withUsername(user.getUsername())
            .password(user.getPassword() == null ? "" : user.getPassword())
            .authorities("ROLE_" + (user.getRole() == null || user.getRole().isBlank() ? "USER" : user.getRole().toUpperCase()))
            .build();
    }
}
