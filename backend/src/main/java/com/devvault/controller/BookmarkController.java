package com.devvault.controller;

import com.devvault.dto.request.BookmarkCreateRequest;
import com.devvault.dto.request.BookmarkUpdateRequest;
import com.devvault.dto.response.BookmarkResponse;
import com.devvault.dto.response.CollectionResponse;
import com.devvault.dto.response.PageResponse;
import com.devvault.enums.ContentType;
import com.devvault.service.BookmarkService;
import com.devvault.service.CollectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;
    private final CollectionService collectionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookmarkResponse create(@Valid @RequestBody BookmarkCreateRequest request,
                                   @AuthenticationPrincipal UserDetails userDetails) {
        return bookmarkService.create(request, currentUserId(userDetails));
    }

    @GetMapping
    public PageResponse<BookmarkResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) ContentType type,
            @AuthenticationPrincipal UserDetails userDetails) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return bookmarkService.listForUser(currentUserId(userDetails), type, pageable);
    }

    @GetMapping("/{id}")
    public BookmarkResponse get(@PathVariable UUID id,
                                @AuthenticationPrincipal UserDetails userDetails) {
        return bookmarkService.getById(id, currentUserId(userDetails));
    }

    @GetMapping("/{id}/collections")
    public List<CollectionResponse> getCollections(@PathVariable UUID id,
                                                   @AuthenticationPrincipal UserDetails userDetails) {
        return collectionService.getCollectionsForBookmark(id, currentUserId(userDetails));
    }

    @PatchMapping("/{id}")
    public BookmarkResponse update(@PathVariable UUID id,
                                   @Valid @RequestBody BookmarkUpdateRequest request,
                                   @AuthenticationPrincipal UserDetails userDetails) {
        return bookmarkService.update(id, request, currentUserId(userDetails));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal UserDetails userDetails) {
        bookmarkService.delete(id, currentUserId(userDetails));
    }

    @GetMapping("/search")
    public PageResponse<BookmarkResponse> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        PageRequest pageable = PageRequest.of(page, size);
        return bookmarkService.search(currentUserId(userDetails), q, pageable);
    }

    private UUID currentUserId(UserDetails userDetails) {
        return UUID.fromString(userDetails.getUsername());
    }
}
