package com.devvault.controller;

import com.devvault.dto.response.UserProfileResponse;
import com.devvault.service.FriendshipService;
import com.devvault.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/u")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final FriendshipService friendshipService;

    @GetMapping("/{username}")
    public UserProfileResponse getPublicProfile(@PathVariable String username) {
        return userService.getPublicProfile(username);
    }

    @GetMapping("/search")
    public List<UserProfileResponse> search(@RequestParam String q,
                                            @AuthenticationPrincipal UserDetails userDetails) {
        return friendshipService.searchUsers(q, UUID.fromString(userDetails.getUsername()));
    }
}
