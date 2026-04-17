package com.devvault.controller;

import com.devvault.dto.request.FriendRequestCreate;
import com.devvault.dto.response.FriendshipResponse;
import com.devvault.service.FriendshipService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/friends")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService friendshipService;

    @PostMapping("/request")
    @ResponseStatus(HttpStatus.CREATED)
    public FriendshipResponse sendRequest(@Valid @RequestBody FriendRequestCreate request,
                                          @AuthenticationPrincipal UserDetails userDetails) {
        return friendshipService.sendRequest(currentUserId(userDetails), request.getUsername());
    }

    @PostMapping("/request/{id}/accept")
    public FriendshipResponse acceptRequest(@PathVariable UUID id,
                                            @AuthenticationPrincipal UserDetails userDetails) {
        return friendshipService.acceptRequest(id, currentUserId(userDetails));
    }

    @DeleteMapping("/request/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void declineRequest(@PathVariable UUID id,
                               @AuthenticationPrincipal UserDetails userDetails) {
        friendshipService.declineRequest(id, currentUserId(userDetails));
    }

    @GetMapping
    public List<FriendshipResponse> getFriends(@AuthenticationPrincipal UserDetails userDetails) {
        return friendshipService.getFriends(currentUserId(userDetails));
    }

    @GetMapping("/requests")
    public List<FriendshipResponse> getIncomingRequests(@AuthenticationPrincipal UserDetails userDetails) {
        return friendshipService.getIncomingRequests(currentUserId(userDetails));
    }

    @GetMapping("/sent")
    public List<FriendshipResponse> getSentRequests(@AuthenticationPrincipal UserDetails userDetails) {
        return friendshipService.getSentRequests(currentUserId(userDetails));
    }

    @DeleteMapping("/{friendId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeFriend(@PathVariable UUID friendId,
                             @AuthenticationPrincipal UserDetails userDetails) {
        friendshipService.removeFriend(currentUserId(userDetails), friendId);
    }

    private UUID currentUserId(UserDetails userDetails) {
        return UUID.fromString(userDetails.getUsername());
    }
}
