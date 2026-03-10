package com.devvault.repository;

import com.devvault.entity.Bookmark;
import com.devvault.enums.AiStatus;
import com.devvault.enums.ContentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {

    Page<Bookmark> findByUserId(UUID userId, Pageable pageable);

    Page<Bookmark> findByUserIdAndContentType(UUID userId, ContentType contentType, Pageable pageable);

    Optional<Bookmark> findByUserIdAndUrl(UUID userId, String url);

    boolean existsByUserIdAndUrl(UUID userId, String url);

    Page<Bookmark> findByUserIdAndIsPublicTrue(UUID userId, Pageable pageable);

    // Full-text search using PostgreSQL tsvector
    @Query(value = """
            SELECT b.* FROM bookmarks b
            WHERE b.user_id = :userId
            AND b.search_vector @@ plainto_tsquery('english', :query)
            ORDER BY ts_rank(b.search_vector, plainto_tsquery('english', :query)) DESC
            """, nativeQuery = true)
    Page<Bookmark> fullTextSearch(@Param("userId") UUID userId,
                                  @Param("query") String query,
                                  Pageable pageable);

    // Bookmarks pending AI processing
    Page<Bookmark> findByAiStatus(AiStatus status, Pageable pageable);
}
