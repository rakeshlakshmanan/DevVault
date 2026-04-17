package com.devvault.dto.response;

import com.devvault.enums.FriendRequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class FriendshipResponse {
    private UUID id;
    private UUID otherUserId;
    private String otherUsername;
    private String otherAvatarUrl;
    private FriendRequestStatus status;
    private boolean isSender;
    private LocalDateTime createdAt;
}
