package com.devvault.dto.response;

import com.devvault.enums.TagSource;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class TagResponse {
    private UUID id;
    private String name;
    private TagSource source;
}
