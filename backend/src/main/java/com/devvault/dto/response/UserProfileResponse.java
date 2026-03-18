package com.devvault.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UserProfileResponse {
    private UUID id;
    private String username;
    private String avatarUrl;
    private String bio;
    private boolean publicProfile;
    private LocalDateTime createdAt;
}
