package com.devvault.service;

import com.devvault.dto.response.UserProfileResponse;
import com.devvault.exception.ResourceNotFoundException;
import com.devvault.mapper.UserMapper;
import com.devvault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

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
