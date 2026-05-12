package com.devvault.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CollectionUpdateRequest {

    @Size(min = 1, max = 200, message = "Name must be between 1 and 200 characters")
    private String name;

    @Size(max = 1000)
    private String description;

    private Boolean isPublic;
}
