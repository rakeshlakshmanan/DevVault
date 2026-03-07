package com.devvault.controller;

import com.devvault.dto.response.UserProfileResponse;
import com.devvault.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/u")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{username}")
    public UserProfileResponse getPublicProfile(@PathVariable String username) {
        return userService.getPublicProfile(username);
    }
}
