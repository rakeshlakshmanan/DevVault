package com.devvault.service;

import com.devvault.dto.request.BookmarkCreateRequest;
import com.devvault.dto.request.BookmarkUpdateRequest;
import com.devvault.dto.response.BookmarkResponse;
import com.devvault.dto.response.PageResponse;
import com.devvault.entity.Bookmark;
import com.devvault.entity.User;
import com.devvault.enums.ContentType;
import com.devvault.exception.DuplicateBookmarkException;
import com.devvault.exception.ResourceNotFoundException;
import com.devvault.mapper.BookmarkMapper;
import com.devvault.repository.BookmarkRepository;
import com.devvault.repository.BookmarkTagRepository;
import com.devvault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final BookmarkTagRepository bookmarkTagRepository;
    private final UserRepository userRepository;
    private final TagService tagService;
    private final ScraperService scraperService;
    private final AiService aiService;
    private final BookmarkMapper bookmarkMapper;

    @Transactional
    public BookmarkResponse create(BookmarkCreateRequest request, UUID userId) {
        if (bookmarkRepository.existsByUserIdAndUrl(userId, request.getUrl())) {
            throw new DuplicateBookmarkException(request.getUrl());
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Scrape metadata
        ScraperService.ScrapedContent scraped = scraperService.scrape(request.getUrl());

        Bookmark bookmark = Bookmark.builder()
                .user(user)
                .url(request.getUrl())
                .title(StringUtils.hasText(request.getTitle()) ? request.getTitle() : scraped.title())
                .description(scraped.description())
                .faviconUrl(scraped.faviconUrl())
                .contentType(request.getContentType())
                .isPublic(request.isPublic())
                .build();

        bookmark = bookmarkRepository.save(bookmark);

        // Apply user-supplied tags
        if (request.getTags() != null && !request.getTags().isEmpty()) {
            tagService.applyUserTags(bookmark, request.getTags());
        }

        // Trigger async AI processing
        String bookmarkId = bookmark.getId().toString();
        aiService.processBookmark(bookmark.getId(), scraped.bodyText());

        var tags = bookmarkTagRepository.findByBookmarkId(bookmark.getId());
        return bookmarkMapper.toResponse(bookmark, tags);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookmarkResponse> listForUser(UUID userId, ContentType contentType, Pageable pageable) {
        Page<Bookmark> page = contentType != null
                ? bookmarkRepository.findByUserIdAndContentType(userId, contentType, pageable)
                : bookmarkRepository.findByUserId(userId, pageable);

        return PageResponse.from(page.map(b -> {
            var tags = bookmarkTagRepository.findByBookmarkId(b.getId());
            return bookmarkMapper.toResponse(b, tags);
        }));
    }

    @Transactional(readOnly = true)
    public BookmarkResponse getById(UUID bookmarkId, UUID userId) {
        Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark", bookmarkId));

        if (!bookmark.getUser().getId().equals(userId) && !bookmark.isPublic()) {
            throw new ResourceNotFoundException("Bookmark", bookmarkId);
        }

        var tags = bookmarkTagRepository.findByBookmarkId(bookmarkId);
        return bookmarkMapper.toResponse(bookmark, tags);
    }

    @Transactional
    public BookmarkResponse update(UUID bookmarkId, BookmarkUpdateRequest request, UUID userId) {
        Bookmark bookmark = getOwnedBookmark(bookmarkId, userId);

        if (StringUtils.hasText(request.getTitle())) bookmark.setTitle(request.getTitle());
        if (request.getContentType() != null) bookmark.setContentType(request.getContentType());
        if (request.getIsPublic() != null) bookmark.setPublic(request.getIsPublic());

        bookmark = bookmarkRepository.save(bookmark);
        var tags = bookmarkTagRepository.findByBookmarkId(bookmarkId);
        return bookmarkMapper.toResponse(bookmark, tags);
    }

    @Transactional
    public void delete(UUID bookmarkId, UUID userId) {
        Bookmark bookmark = getOwnedBookmark(bookmarkId, userId);
        bookmarkRepository.delete(bookmark);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookmarkResponse> search(UUID userId, String query, Pageable pageable) {
        Page<Bookmark> page = bookmarkRepository.fullTextSearch(userId, query, pageable);
        return PageResponse.from(page.map(b -> {
            var tags = bookmarkTagRepository.findByBookmarkId(b.getId());
            return bookmarkMapper.toResponse(b, tags);
        }));
    }

    private Bookmark getOwnedBookmark(UUID bookmarkId, UUID userId) {
        Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark", bookmarkId));
        if (!bookmark.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Bookmark", bookmarkId);
        }
        return bookmark;
    }
}
