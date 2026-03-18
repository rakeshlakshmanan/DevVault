package com.devvault.dto.response;

import com.devvault.enums.AiStatus;
import com.devvault.enums.ContentType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class BookmarkResponse {
    private UUID id;
    private String url;
    private String title;
    private String description;
    private String faviconUrl;
    private ContentType contentType;
    private AiStatus aiStatus;
    private String aiSummary;
    private boolean isPublic;
    private List<TagResponse> tags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
