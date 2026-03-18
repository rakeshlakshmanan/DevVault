package com.devvault.dto.request;

import com.devvault.enums.ContentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.hibernate.validator.constraints.URL;

import java.util.Set;

@Data
public class BookmarkCreateRequest {

    @NotBlank
    @URL
    @Size(max = 2048)
    private String url;

    private String title;

    private ContentType contentType;

    private boolean isPublic = false;

    private Set<String> tags;
}
