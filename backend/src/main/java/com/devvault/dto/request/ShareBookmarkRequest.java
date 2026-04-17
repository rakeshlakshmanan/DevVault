package com.devvault.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ShareBookmarkRequest {

    @NotNull
    private UUID bookmarkId;

    @NotNull
    private UUID receiverUserId;
}
