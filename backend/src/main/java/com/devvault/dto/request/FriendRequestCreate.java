package com.devvault.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FriendRequestCreate {

    @NotBlank
    private String username;
}
