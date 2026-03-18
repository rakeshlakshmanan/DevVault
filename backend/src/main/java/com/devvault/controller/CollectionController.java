package com.devvault.controller;

import com.devvault.dto.request.CollectionCreateRequest;
import com.devvault.dto.response.BookmarkResponse;
import com.devvault.dto.response.CollectionResponse;
import com.devvault.dto.response.PageResponse;
import com.devvault.service.CollectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/collections")
@RequiredArgsConstructor
public class CollectionController {

    private final CollectionService collectionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CollectionResponse create(@Valid @RequestBody CollectionCreateRequest request,
                                     @AuthenticationPrincipal UserDetails userDetails) {
        return collectionService.create(request, currentUserId(userDetails));
    }

    @GetMapping
    public PageResponse<CollectionResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return collectionService.listForUser(currentUserId(userDetails), pageable);
    }

    @PostMapping("/{id}/bookmarks/{bookmarkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addBookmark(@PathVariable UUID id,
                            @PathVariable UUID bookmarkId,
                            @AuthenticationPrincipal UserDetails userDetails) {
        collectionService.addBookmark(id, bookmarkId, currentUserId(userDetails));
    }

    @DeleteMapping("/{id}/bookmarks/{bookmarkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeBookmark(@PathVariable UUID id,
                               @PathVariable UUID bookmarkId,
                               @AuthenticationPrincipal UserDetails userDetails) {
        collectionService.removeBookmark(id, bookmarkId, currentUserId(userDetails));
    }

    @GetMapping("/{id}/bookmarks")
    public PageResponse<BookmarkResponse> getBookmarks(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        PageRequest pageable = PageRequest.of(page, size);
        return collectionService.getBookmarks(id, currentUserId(userDetails), pageable);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal UserDetails userDetails) {
        collectionService.delete(id, currentUserId(userDetails));
    }

    private UUID currentUserId(UserDetails userDetails) {
        return UUID.fromString(userDetails.getUsername());
    }
}
