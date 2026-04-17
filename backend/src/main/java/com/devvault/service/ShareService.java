package com.devvault.service;

import com.devvault.dto.response.SharedBookmarkResponse;
import com.devvault.entity.Bookmark;
import com.devvault.entity.SharedBookmark;
import com.devvault.entity.User;
import com.devvault.enums.FriendRequestStatus;
import com.devvault.exception.ResourceNotFoundException;
import com.devvault.mapper.BookmarkMapper;
import com.devvault.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShareService {

    private final SharedBookmarkRepository sharedBookmarkRepository;
    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final BookmarkTagRepository bookmarkTagRepository;
    private final BookmarkMapper bookmarkMapper;

    @Transactional
    public SharedBookmarkResponse share(UUID senderId, UUID bookmarkId, UUID receiverId) {
        if (senderId.equals(receiverId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot share a bookmark with yourself");
        }

        friendshipRepository.findBetween(senderId, receiverId)
                .filter(f -> f.getStatus() == FriendRequestStatus.ACCEPTED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only share bookmarks with friends"));

        Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .filter(b -> b.getUser().getId().equals(senderId))
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark", bookmarkId));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", senderId));

        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new ResourceNotFoundException("User", receiverId));

        SharedBookmark share = sharedBookmarkRepository.save(
                SharedBookmark.builder().sender(sender).receiver(receiver).bookmark(bookmark).build()
        );

        return toResponse(share);
    }

    @Transactional(readOnly = true)
    public List<SharedBookmarkResponse> getInbox(UUID userId) {
        return sharedBookmarkRepository.findByReceiverIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void markRead(UUID shareId, UUID userId) {
        SharedBookmark share = sharedBookmarkRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share", shareId));
        if (!share.getReceiver().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your share");
        }
        share.setRead(true);
        sharedBookmarkRepository.save(share);
    }

    @Transactional(readOnly = true)
    public int getUnreadCount(UUID userId) {
        return sharedBookmarkRepository.countByReceiverIdAndIsReadFalse(userId);
    }

    private SharedBookmarkResponse toResponse(SharedBookmark s) {
        var tags = bookmarkTagRepository.findByBookmarkId(s.getBookmark().getId());
        return SharedBookmarkResponse.builder()
                .id(s.getId())
                .senderUserId(s.getSender().getId())
                .senderUsername(s.getSender().getUsername())
                .senderAvatarUrl(s.getSender().getAvatarUrl())
                .bookmark(bookmarkMapper.toResponse(s.getBookmark(), tags))
                .isRead(s.isRead())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
