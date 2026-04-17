package com.devvault.repository;

import com.devvault.entity.Friendship;
import com.devvault.enums.FriendRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {

    List<Friendship> findByReceiverIdAndStatus(UUID receiverId, FriendRequestStatus status);

    List<Friendship> findBySenderIdAndStatus(UUID senderId, FriendRequestStatus status);

    @Query("""
            SELECT f FROM Friendship f
            WHERE f.status = 'ACCEPTED'
            AND (f.sender.id = :userId OR f.receiver.id = :userId)
            """)
    List<Friendship> findAcceptedFriendships(UUID userId);

    @Query("""
            SELECT f FROM Friendship f
            WHERE (f.sender.id = :userId AND f.receiver.id = :otherId)
               OR (f.sender.id = :otherId AND f.receiver.id = :userId)
            """)
    Optional<Friendship> findBetween(UUID userId, UUID otherId);

    boolean existsBySenderIdAndReceiverId(UUID senderId, UUID receiverId);
}
