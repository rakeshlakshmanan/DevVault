package com.devvault.service;

import com.devvault.dto.response.UserProfileResponse;
import com.devvault.exception.ResourceNotFoundException;
import com.devvault.mapper.UserMapper;
import com.devvault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for user profile operations.
 *
 * <p>Currently exposes public profile retrieval. Only users who have opted in
 * to a public profile are visible to other users.</p>
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    /**
     * Retrieves the public profile for a user by username.
     *
     * <p>Throws {@link ResourceNotFoundException} in both the "not found" and "profile is private"
     * cases to avoid leaking whether a username exists.</p>
     *
     * @param username the username to look up
     * @return the {@link UserProfileResponse} DTO for the user's public profile
     * @throws ResourceNotFoundException if the user does not exist or has not enabled a public profile
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getPublicProfile(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        if (!user.isPublicProfile()) {
            throw new ResourceNotFoundException("User not found: " + username);
        }

        return userMapper.toProfileResponse(user);
    }
}
