package com.devvault.repository;

import com.devvault.entity.CollectionBookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CollectionBookmarkRepository extends JpaRepository<CollectionBookmark, UUID> {

    Page<CollectionBookmark> findByCollectionId(UUID collectionId, Pageable pageable);

    boolean existsByCollectionIdAndBookmarkId(UUID collectionId, UUID bookmarkId);

    void deleteByCollectionIdAndBookmarkId(UUID collectionId, UUID bookmarkId);

    int countByCollectionId(UUID collectionId);

    List<CollectionBookmark> findByBookmarkIdAndCollectionUserId(UUID bookmarkId, UUID userId);
}
