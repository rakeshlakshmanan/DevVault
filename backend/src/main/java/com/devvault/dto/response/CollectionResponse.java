package com.devvault.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class CollectionResponse {
    private UUID id;
    private String name;
    private String description;
    private boolean isPublic;
    private int bookmarkCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
