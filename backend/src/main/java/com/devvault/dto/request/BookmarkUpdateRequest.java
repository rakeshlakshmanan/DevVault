package com.devvault.dto.request;

import com.devvault.enums.ContentType;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BookmarkUpdateRequest {

    @Size(max = 512)
    private String title;

    private ContentType contentType;

    private Boolean isPublic;
}
