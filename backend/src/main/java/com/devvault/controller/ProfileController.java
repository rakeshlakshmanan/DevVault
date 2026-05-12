package com.devvault.controller;

import com.devvault.dto.request.UserUpdateRequest;
import com.devvault.dto.response.UserMeResponse;
import com.devvault.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserService userService;

    @GetMapping
    public UserMeResponse getMe(@AuthenticationPrincipal UserDetails userDetails) {
        return userService.getOwnProfile(UUID.fromString(userDetails.getUsername()));
    }

    @PatchMapping
    public UserMeResponse updateMe(@Valid @RequestBody UserUpdateRequest request,
                                   @AuthenticationPrincipal UserDetails userDetails) {
        return userService.updateProfile(UUID.fromString(userDetails.getUsername()), request);
    }
}
