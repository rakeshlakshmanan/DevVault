package com.devvault.controller;

import com.devvault.dto.response.TagResponse;
import com.devvault.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookmarks/{bookmarkId}/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public List<TagResponse> getTagsForBookmark(@PathVariable UUID bookmarkId) {
        return tagService.getTagsForBookmark(bookmarkId);
    }

    @DeleteMapping("/{tagId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeTag(@PathVariable UUID bookmarkId,
                          @PathVariable UUID tagId,
                          @AuthenticationPrincipal UserDetails userDetails) {
        tagService.removeTag(bookmarkId, tagId, UUID.fromString(userDetails.getUsername()));
    }
}
