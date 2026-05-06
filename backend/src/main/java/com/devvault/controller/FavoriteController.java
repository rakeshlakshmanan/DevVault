package com.devvault.controller;

import com.devvault.dto.response.BookmarkResponse;
import com.devvault.dto.response.PageResponse;
import com.devvault.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @PostMapping("/api/v1/bookmarks/{id}/favorite")
    public Map<String, Boolean> toggle(@PathVariable UUID id,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        boolean isFavorited = favoriteService.toggle(id, currentUserId(userDetails));
        return Map.of("isFavorited", isFavorited);
    }

    @GetMapping("/api/v1/bookmarks/{id}/favorite")
    public Map<String, Boolean> check(@PathVariable UUID id,
                                      @AuthenticationPrincipal UserDetails userDetails) {
        boolean isFavorited = favoriteService.isFavorited(id, currentUserId(userDetails));
        return Map.of("isFavorited", isFavorited);
    }

    @GetMapping("/api/v1/favorites/ids")
    public List<String> listIds(@AuthenticationPrincipal UserDetails userDetails) {
        return favoriteService.listIdsForUser(currentUserId(userDetails))
                .stream().map(UUID::toString).toList();
    }

    @GetMapping("/api/v1/favorites")
    public PageResponse<BookmarkResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return favoriteService.listForUser(currentUserId(userDetails), pageable);
    }

    private UUID currentUserId(UserDetails userDetails) {
        return UUID.fromString(userDetails.getUsername());
    }
}
