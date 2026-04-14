package com.devvault.security;

import com.devvault.entity.User;
import com.devvault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Custom implementation of {@link UserDetailsService} that loads user details
 * from the database for Spring Security authentication.
 *
 * <p>This service is used by the JWT authentication filter to resolve users
 * from either their UUID or email address.</p>
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads a user by their UUID string, as extracted from the JWT token.
     *
     * <p>This override is called by the {@code JwtAuthFilter} with the subject
     * claim of the JWT, which holds the user's UUID.</p>
     *
     * @param userId the UUID of the user as a string
     * @return a {@link UserDetails} instance with the user's ID, hashed password, and roles
     * @throws UsernameNotFoundException if no user exists with the given UUID
     */
    @Override
    public UserDetails loadUserByUsername(String userId) throws UsernameNotFoundException {
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));

        return new org.springframework.security.core.userdetails.User(
                user.getId().toString(),
                user.getPasswordHash() != null ? user.getPasswordHash() : "",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }

    /**
     * Loads a user by their email address.
     *
     * <p>Used during password-based login to look up the user before verifying credentials.</p>
     *
     * @param email the user's email address
     * @return a {@link UserDetails} instance with the user's ID, hashed password, and roles
     * @throws UsernameNotFoundException if no user exists with the given email
     */
    public UserDetails loadUserByEmail(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        return new org.springframework.security.core.userdetails.User(
                user.getId().toString(),
                user.getPasswordHash() != null ? user.getPasswordHash() : "",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }
}
