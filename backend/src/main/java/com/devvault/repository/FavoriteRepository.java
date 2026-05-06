package com.devvault.repository;

import com.devvault.entity.Favorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {

    boolean existsByUserIdAndBookmarkId(UUID userId, UUID bookmarkId);

    Optional<Favorite> findByUserIdAndBookmarkId(UUID userId, UUID bookmarkId);

    Page<Favorite> findByUserId(UUID userId, Pageable pageable);

    @Query("SELECT f.bookmark.id FROM Favorite f WHERE f.user.id = :userId")
    List<UUID> findBookmarkIdsByUserId(UUID userId);
}
