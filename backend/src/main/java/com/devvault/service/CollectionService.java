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

@Service
@RequiredArgsConstructor
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final CollectionBookmarkRepository collectionBookmarkRepository;
    private final BookmarkRepository bookmarkRepository;
    private final BookmarkTagRepository bookmarkTagRepository;
    private final UserRepository userRepository;
    private final BookmarkMapper bookmarkMapper;

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

    @Transactional(readOnly = true)
    public PageResponse<CollectionResponse> listForUser(UUID userId, Pageable pageable) {
        Page<Collection> page = collectionRepository.findByUserId(userId, pageable);
        return PageResponse.from(page.map(c -> toResponse(c,
                collectionBookmarkRepository.countByCollectionId(c.getId()))));
    }

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

    @Transactional
    public void removeBookmark(UUID collectionId, UUID bookmarkId, UUID userId) {
        getOwnedCollection(collectionId, userId);
        collectionBookmarkRepository.deleteByCollectionIdAndBookmarkId(collectionId, bookmarkId);
    }

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

    @Transactional
    public void delete(UUID collectionId, UUID userId) {
        Collection collection = getOwnedCollection(collectionId, userId);
        collectionRepository.delete(collection);
    }

    private Collection getOwnedCollection(UUID collectionId, UUID userId) {
        return collectionRepository.findByIdAndUserId(collectionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", collectionId));
    }

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
