package com.devvault.service;

import com.devvault.dto.response.FriendshipResponse;
import com.devvault.dto.response.UserProfileResponse;
import com.devvault.entity.Friendship;
import com.devvault.entity.User;
import com.devvault.enums.FriendRequestStatus;
import com.devvault.exception.ResourceNotFoundException;
import com.devvault.repository.FriendshipRepository;
import com.devvault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    @Transactional
    public FriendshipResponse sendRequest(UUID senderId, String receiverUsername) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", senderId));

        if (sender.getUsername().equalsIgnoreCase(receiverUsername)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot send a friend request to yourself");
        }

        User receiver = userRepository.findByUsername(receiverUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User with username: " + receiverUsername));

        friendshipRepository.findBetween(senderId, receiver.getId()).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Friend request already exists");
        });

        Friendship friendship = friendshipRepository.save(
                Friendship.builder().sender(sender).receiver(receiver).build()
        );

        return toResponse(friendship, senderId);
    }

    @Transactional
    public FriendshipResponse acceptRequest(UUID requestId, UUID receiverId) {
        Friendship friendship = getRequestForReceiver(requestId, receiverId);
        friendship.setStatus(FriendRequestStatus.ACCEPTED);
        return toResponse(friendshipRepository.save(friendship), receiverId);
    }

    @Transactional
    public void declineRequest(UUID requestId, UUID receiverId) {
        Friendship friendship = getRequestForReceiver(requestId, receiverId);
        friendshipRepository.delete(friendship);
    }

    @Transactional
    public void removeFriend(UUID userId, UUID friendId) {
        Friendship friendship = friendshipRepository.findBetween(userId, friendId)
                .filter(f -> f.getStatus() == FriendRequestStatus.ACCEPTED)
                .orElseThrow(() -> new ResourceNotFoundException("Friendship not found"));
        friendshipRepository.delete(friendship);
    }

    @Transactional(readOnly = true)
    public List<FriendshipResponse> getFriends(UUID userId) {
        return friendshipRepository.findAcceptedFriendships(userId).stream()
                .map(f -> toResponse(f, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FriendshipResponse> getIncomingRequests(UUID userId) {
        return friendshipRepository.findByReceiverIdAndStatus(userId, FriendRequestStatus.PENDING).stream()
                .map(f -> toResponse(f, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FriendshipResponse> getSentRequests(UUID userId) {
        return friendshipRepository.findBySenderIdAndStatus(userId, FriendRequestStatus.PENDING).stream()
                .map(f -> toResponse(f, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserProfileResponse> searchUsers(String query, UUID currentUserId) {
        return userRepository.findByUsernameContainingIgnoreCaseAndIdNot(query, currentUserId)
                .stream()
                .limit(20)
                .map(u -> UserProfileResponse.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .avatarUrl(u.getAvatarUrl())
                        .bio(u.getBio())
                        .publicProfile(u.isPublicProfile())
                        .createdAt(u.getCreatedAt())
                        .build())
                .toList();
    }

    private Friendship getRequestForReceiver(UUID requestId, UUID receiverId) {
        Friendship friendship = friendshipRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend request", requestId));
        if (!friendship.getReceiver().getId().equals(receiverId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your request");
        }
        if (friendship.getStatus() != FriendRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request already responded to");
        }
        return friendship;
    }

    private FriendshipResponse toResponse(Friendship f, UUID viewerId) {
        boolean isSender = f.getSender().getId().equals(viewerId);
        User other = isSender ? f.getReceiver() : f.getSender();
        return FriendshipResponse.builder()
                .id(f.getId())
                .otherUserId(other.getId())
                .otherUsername(other.getUsername())
                .otherAvatarUrl(other.getAvatarUrl())
                .status(f.getStatus())
                .isSender(isSender)
                .createdAt(f.getCreatedAt())
                .build();
    }
}
