package com.devvault.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class SharedBookmarkResponse {
    private UUID id;
    private UUID senderUserId;
    private String senderUsername;
    private String senderAvatarUrl;
    private BookmarkResponse bookmark;
    private boolean isRead;
    private LocalDateTime createdAt;
}
