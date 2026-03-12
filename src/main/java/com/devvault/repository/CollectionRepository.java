package com.devvault.repository;

import com.devvault.entity.Collection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CollectionRepository extends JpaRepository<Collection, UUID> {

    Page<Collection> findByUserId(UUID userId, Pageable pageable);

    Page<Collection> findByUserIdAndIsPublicTrue(UUID userId, Pageable pageable);

    Optional<Collection> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndName(UUID userId, String name);
}
