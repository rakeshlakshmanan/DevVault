package com.devvault.service;

import com.devvault.dto.request.CollectionCreateRequest;
import com.devvault.dto.response.BookmarkResponse;
import com.devvault.dto.response.CollectionResponse;
import com.devvault.dto.response.PageResponse;
import com.devvault.entity.Bookmark;
import com.devvault.entity.Collection;
import com.devvault.entity.CollectionBookmark;
import com.devvault.entity.User;
import com.devvault.exception.ResourceNotFoundException;
import com.devvault.mapper.BookmarkMapper;
import com.devvault.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for managing collections of bookmarks.
 *
 * <p>Collections allow users to group bookmarks together. A collection may be
 * public (visible to anyone) or private (visible only to its owner).</p>
 */
@Service
@RequiredArgsConstructor
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final CollectionBookmarkRepository collectionBookmarkRepository;
    private final BookmarkRepository bookmarkRepository;
    private final BookmarkTagRepository bookmarkTagRepository;
    private final UserRepository userRepository;
    private final BookmarkMapper bookmarkMapper;

    /**
     * Creates a new collection for the given user.
     *
     * @param request the collection creation payload (name, description, visibility)
     * @param userId  the ID of the authenticated user
     * @return the created {@link CollectionResponse} DTO (bookmark count will be 0)
     * @throws ResourceNotFoundException if the user does not exist
     */
    @Transactional
    public CollectionResponse create(CollectionCreateRequest request, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Collection collection = Collection.builder()
                .user(user)
                .name(request.getName())
                .description(request.getDescription())
                .isPublic(request.isPublic())
                .build();

        collection = collectionRepository.save(collection);
        return toResponse(collection, 0);
    }

    /**
     * Returns a paginated list of all collections owned by the given user,
     * each including its current bookmark count.
     *
     * @param userId   the ID of the user whose collections to list
     * @param pageable pagination and sorting parameters
     * @return a {@link PageResponse} of {@link CollectionResponse} DTOs
     */
    @Transactional(readOnly = true)
    public PageResponse<CollectionResponse> listForUser(UUID userId, Pageable pageable) {
        Page<Collection> page = collectionRepository.findByUserId(userId, pageable);
        return PageResponse.from(page.map(c -> toResponse(c,
                collectionBookmarkRepository.countByCollectionId(c.getId()))));
    }

    /**
     * Adds a bookmark to a collection. This operation is idempotent — calling it when
     * the bookmark is already in the collection has no effect.
     *
     * @param collectionId the ID of the collection
     * @param bookmarkId   the ID of the bookmark to add
     * @param userId       the ID of the requesting user; must be the collection owner
     * @throws ResourceNotFoundException if the collection or bookmark does not exist,
     *                                   or the collection is not owned by the user
     */
    @Transactional
    public void addBookmark(UUID collectionId, UUID bookmarkId, UUID userId) {
        Collection collection = getOwnedCollection(collectionId, userId);

        if (collectionBookmarkRepository.existsByCollectionIdAndBookmarkId(collectionId, bookmarkId)) {
            return; // idempotent
        }

        Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark", bookmarkId));

        collectionBookmarkRepository.save(CollectionBookmark.builder()
                .collection(collection)
                .bookmark(bookmark)
                .build());
    }

    /**
     * Removes a bookmark from a collection.
     *
     * @param collectionId the ID of the collection
     * @param bookmarkId   the ID of the bookmark to remove
     * @param userId       the ID of the requesting user; must be the collection owner
     * @throws ResourceNotFoundException if the collection does not exist or is not owned by the user
     */
    @Transactional
    public void removeBookmark(UUID collectionId, UUID bookmarkId, UUID userId) {
        getOwnedCollection(collectionId, userId);
        collectionBookmarkRepository.deleteByCollectionIdAndBookmarkId(collectionId, bookmarkId);
    }

    /**
     * Returns a paginated list of bookmarks in a collection.
     *
     * <p>The requesting user may access the collection if they own it or if it is public.
     * A {@link ResourceNotFoundException} is thrown in both the "not found" and "private
     * and not owner" cases to avoid leaking existence information.</p>
     *
     * @param collectionId the ID of the collection
     * @param userId       the ID of the requesting user
     * @param pageable     pagination and sorting parameters
     * @return a {@link PageResponse} of {@link BookmarkResponse} DTOs
     * @throws ResourceNotFoundException if the collection does not exist or is not accessible
     */
    @Transactional(readOnly = true)
    public PageResponse<BookmarkResponse> getBookmarks(UUID collectionId, UUID userId, Pageable pageable) {
        Collection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", collectionId));

        if (!collection.getUser().getId().equals(userId) && !collection.isPublic()) {
            throw new ResourceNotFoundException("Collection", collectionId);
        }

        Page<CollectionBookmark> page = collectionBookmarkRepository.findByCollectionId(collectionId, pageable);
        return PageResponse.from(page.map(cb -> {
            var tags = bookmarkTagRepository.findByBookmarkId(cb.getBookmark().getId());
            return bookmarkMapper.toResponse(cb.getBookmark(), tags);
        }));
    }

    /**
     * Deletes a collection owned by the given user.
     *
     * @param collectionId the ID of the collection to delete
     * @param userId       the ID of the requesting user; must be the collection owner
     * @throws ResourceNotFoundException if the collection does not exist or is not owned by the user
     */
    @Transactional
    public void delete(UUID collectionId, UUID userId) {
        Collection collection = getOwnedCollection(collectionId, userId);
        collectionRepository.delete(collection);
    }

    /**
     * Retrieves a collection and verifies that it belongs to the given user.
     *
     * @param collectionId the ID of the collection
     * @param userId       the expected owner's user ID
     * @return the {@link Collection} entity
     * @throws ResourceNotFoundException if the collection does not exist or is not owned by the user
     */
    private Collection getOwnedCollection(UUID collectionId, UUID userId) {
        return collectionRepository.findByIdAndUserId(collectionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", collectionId));
    }

    /**
     * Maps a {@link Collection} entity to a {@link CollectionResponse} DTO.
     *
     * @param collection    the collection entity
     * @param bookmarkCount the current number of bookmarks in the collection
     * @return the populated {@link CollectionResponse}
     */
    private CollectionResponse toResponse(Collection collection, int bookmarkCount) {
        return CollectionResponse.builder()
                .id(collection.getId())
                .name(collection.getName())
                .description(collection.getDescription())
                .isPublic(collection.isPublic())
                .bookmarkCount(bookmarkCount)
                .createdAt(collection.getCreatedAt())
                .updatedAt(collection.getUpdatedAt())
                .build();
    }
}
