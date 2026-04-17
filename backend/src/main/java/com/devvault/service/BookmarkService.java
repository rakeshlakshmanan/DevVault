package com.devvault.service;

import com.devvault.dto.request.BookmarkCreateRequest;
import com.devvault.dto.request.BookmarkUpdateRequest;
import com.devvault.dto.response.BookmarkResponse;
import com.devvault.dto.response.PageResponse;
import com.devvault.entity.Bookmark;
import com.devvault.entity.User;
import com.devvault.enums.ContentType;
import com.devvault.event.BookmarkCreatedEvent;
import com.devvault.exception.DuplicateBookmarkException;
import com.devvault.exception.ResourceNotFoundException;
import com.devvault.mapper.BookmarkMapper;
import com.devvault.repository.BookmarkRepository;
import com.devvault.repository.BookmarkTagRepository;
import com.devvault.repository.SharedBookmarkRepository;
import com.devvault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

/**
 * Core service for managing bookmarks.
 *
 * <p>Orchestrates URL scraping, AI processing, tag application, and CRUD operations
 * for bookmarks owned by a specific user.</p>
 */
@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final BookmarkTagRepository bookmarkTagRepository;
    private final UserRepository userRepository;
    private final SharedBookmarkRepository sharedBookmarkRepository;
    private final TagService tagService;
    private final ScraperService scraperService;
    private final BookmarkMapper bookmarkMapper;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Creates a new bookmark for the given user.
     *
     * <p>Scrapes the URL for metadata (title, description, favicon, body text), saves the
     * bookmark, applies any user-supplied tags, and triggers asynchronous AI processing
     * to generate a summary and AI tags.</p>
     *
     * @param request the bookmark creation payload containing URL, optional title, tags, etc.
     * @param userId  the ID of the authenticated user creating the bookmark
     * @return the created {@link BookmarkResponse} DTO
     * @throws DuplicateBookmarkException if the user already has a bookmark for the same URL
     * @throws ResourceNotFoundException  if the user does not exist
     */
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

        // Publish event — AI processing fires after this transaction commits
        eventPublisher.publishEvent(new BookmarkCreatedEvent(bookmark.getId(), scraped.bodyText()));

        var tags = bookmarkTagRepository.findByBookmarkId(bookmark.getId());
        return bookmarkMapper.toResponse(bookmark, tags);
    }

    /**
     * Returns a paginated list of bookmarks for the given user.
     *
     * @param userId      the ID of the user whose bookmarks to list
     * @param contentType optional filter to return only bookmarks of a specific content type;
     *                    pass {@code null} to return all bookmarks
     * @param pageable    pagination and sorting parameters
     * @return a {@link PageResponse} wrapping the matching {@link BookmarkResponse} DTOs
     */
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

    /**
     * Retrieves a single bookmark by ID.
     *
     * <p>The requesting user may access the bookmark if they own it or if the bookmark
     * is marked as public. A {@link ResourceNotFoundException} is thrown in both the
     * "not found" and "private and not owner" cases to avoid leaking existence information.</p>
     *
     * @param bookmarkId the ID of the bookmark to retrieve
     * @param userId     the ID of the requesting user
     * @return the {@link BookmarkResponse} DTO
     * @throws ResourceNotFoundException if the bookmark does not exist or is not accessible
     */
    @Transactional(readOnly = true)
    public BookmarkResponse getById(UUID bookmarkId, UUID userId) {
        Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark", bookmarkId));

        boolean isOwner = bookmark.getUser().getId().equals(userId);
        boolean isSharedWithUser = sharedBookmarkRepository.existsByBookmarkIdAndReceiverId(bookmarkId, userId);
        if (!isOwner && !bookmark.isPublic() && !isSharedWithUser) {
            throw new ResourceNotFoundException("Bookmark", bookmarkId);
        }

        var tags = bookmarkTagRepository.findByBookmarkId(bookmarkId);
        return bookmarkMapper.toResponse(bookmark, tags);
    }

    /**
     * Updates mutable fields of an owned bookmark (title, content type, visibility).
     *
     * <p>Only non-null fields in the request are applied; unset fields retain their current values.</p>
     *
     * @param bookmarkId the ID of the bookmark to update
     * @param request    the update payload
     * @param userId     the ID of the requesting user; must be the bookmark owner
     * @return the updated {@link BookmarkResponse} DTO
     * @throws ResourceNotFoundException if the bookmark does not exist or is not owned by the user
     */
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

    /**
     * Deletes an owned bookmark and its associated data.
     *
     * @param bookmarkId the ID of the bookmark to delete
     * @param userId     the ID of the requesting user; must be the bookmark owner
     * @throws ResourceNotFoundException if the bookmark does not exist or is not owned by the user
     */
    @Transactional
    public void delete(UUID bookmarkId, UUID userId) {
        Bookmark bookmark = getOwnedBookmark(bookmarkId, userId);
        bookmarkRepository.delete(bookmark);
    }

    /**
     * Performs a full-text search over the user's bookmarks.
     *
     * @param userId   the ID of the user whose bookmarks to search
     * @param query    the search query string
     * @param pageable pagination and sorting parameters
     * @return a {@link PageResponse} containing matching {@link BookmarkResponse} DTOs
     */
    @Transactional(readOnly = true)
    public PageResponse<BookmarkResponse> search(UUID userId, String query, Pageable pageable) {
        Page<Bookmark> page = bookmarkRepository.fullTextSearch(userId, query, pageable);
        return PageResponse.from(page.map(b -> {
            var tags = bookmarkTagRepository.findByBookmarkId(b.getId());
            return bookmarkMapper.toResponse(b, tags);
        }));
    }

    /**
     * Retrieves a bookmark and verifies that it belongs to the given user.
     *
     * <p>Throws {@link ResourceNotFoundException} in both the "not found" and "wrong owner"
     * cases to avoid leaking the existence of bookmarks belonging to other users.</p>
     *
     * @param bookmarkId the ID of the bookmark
     * @param userId     the expected owner's user ID
     * @return the {@link Bookmark} entity
     * @throws ResourceNotFoundException if the bookmark does not exist or is not owned by the user
     */
    private Bookmark getOwnedBookmark(UUID bookmarkId, UUID userId) {
        Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark", bookmarkId));
        if (!bookmark.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Bookmark", bookmarkId);
        }
        return bookmark;
    }
}
