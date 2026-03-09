package com.devvault.controller;

import com.devvault.dto.request.BookmarkCreateRequest;
import com.devvault.dto.request.BookmarkUpdateRequest;
import com.devvault.dto.response.BookmarkResponse;
import com.devvault.dto.response.PageResponse;
import com.devvault.enums.ContentType;
import com.devvault.service.BookmarkService;
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
@RequestMapping("/api/v1/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookmarkResponse create(@Valid @RequestBody BookmarkCreateRequest request,
                                   @AuthenticationPrincipal UserDetails userDetails) {
        return bookmarkService.create(request, currentUserId(userDetails));
    }


    private UUID currentUserId(UserDetails userDetails) {
        return UUID.fromString(userDetails.getUsername());
    }
}
