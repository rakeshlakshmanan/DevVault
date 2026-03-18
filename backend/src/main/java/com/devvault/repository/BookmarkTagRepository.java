package com.devvault.repository;

import com.devvault.entity.Bookmark;
import com.devvault.entity.BookmarkTag;
import com.devvault.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BookmarkTagRepository extends JpaRepository<BookmarkTag, UUID> {

    List<BookmarkTag> findByBookmark(Bookmark bookmark);

    List<BookmarkTag> findByBookmarkId(UUID bookmarkId);

    boolean existsByBookmarkAndTag(Bookmark bookmark, Tag tag);

    void deleteByBookmarkAndTag(Bookmark bookmark, Tag tag);

    @Query("""
            SELECT bt FROM BookmarkTag bt
            JOIN FETCH bt.tag
            WHERE bt.bookmark.id IN :bookmarkIds
            """)
    List<BookmarkTag> findByBookmarkIdIn(@Param("bookmarkIds") List<UUID> bookmarkIds);
}
