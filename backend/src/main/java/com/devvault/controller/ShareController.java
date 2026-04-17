package com.devvault.controller;

import com.devvault.dto.request.ShareBookmarkRequest;
import com.devvault.dto.response.SharedBookmarkResponse;
import com.devvault.service.ShareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shares")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SharedBookmarkResponse share(@Valid @RequestBody ShareBookmarkRequest request,
                                        @AuthenticationPrincipal UserDetails userDetails) {
        return shareService.share(currentUserId(userDetails), request.getBookmarkId(), request.getReceiverUserId());
    }

    @GetMapping("/inbox")
    public List<SharedBookmarkResponse> getInbox(@AuthenticationPrincipal UserDetails userDetails) {
        return shareService.getInbox(currentUserId(userDetails));
    }

    @GetMapping("/unread-count")
    public Map<String, Integer> getUnreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        return Map.of("count", shareService.getUnreadCount(currentUserId(userDetails)));
    }

    @PatchMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@PathVariable UUID id,
                         @AuthenticationPrincipal UserDetails userDetails) {
        shareService.markRead(id, currentUserId(userDetails));
    }

    private UUID currentUserId(UserDetails userDetails) {
        return UUID.fromString(userDetails.getUsername());
    }
}
