package com.devvault.repository;

import com.devvault.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, UUID> {

    Optional<Tag> findByNameIgnoreCase(String name);

    @Query("""
            SELECT t FROM Tag t
            JOIN BookmarkTag bt ON bt.tag = t
            JOIN bt.bookmark b
            WHERE b.user.id = :userId
            GROUP BY t
            ORDER BY COUNT(bt) DESC
            """)
    List<Tag> findTopTagsByUserId(@Param("userId") UUID userId);
}
