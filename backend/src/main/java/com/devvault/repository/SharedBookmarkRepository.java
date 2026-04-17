package com.devvault.repository;

import com.devvault.entity.SharedBookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SharedBookmarkRepository extends JpaRepository<SharedBookmark, UUID> {

    List<SharedBookmark> findByReceiverIdOrderByCreatedAtDesc(UUID receiverId);

    int countByReceiverIdAndIsReadFalse(UUID receiverId);

    boolean existsByBookmarkIdAndReceiverId(UUID bookmarkId, UUID receiverId);
}
