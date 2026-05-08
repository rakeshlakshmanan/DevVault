package com.devvault.service;

import com.devvault.dto.response.BookmarkResponse;
import com.devvault.dto.response.PageResponse;
import com.devvault.entity.Bookmark;
import com.devvault.entity.Favorite;
import com.devvault.entity.User;
import com.devvault.exception.ResourceNotFoundException;
import com.devvault.mapper.BookmarkMapper;
import com.devvault.repository.BookmarkRepository;
import com.devvault.repository.BookmarkTagRepository;
import com.devvault.repository.FavoriteRepository;
import com.devvault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final BookmarkRepository bookmarkRepository;
    private final BookmarkTagRepository bookmarkTagRepository;
    private final UserRepository userRepository;
    private final BookmarkMapper bookmarkMapper;

    @Transactional
    public boolean toggle(UUID bookmarkId, UUID userId) {
        return favoriteRepository.findByUserIdAndBookmarkId(userId, bookmarkId)
                .map(fav -> { favoriteRepository.delete(fav); return false; })
                .orElseGet(() -> {
                    Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                            .orElseThrow(() -> new ResourceNotFoundException("Bookmark", bookmarkId));
                    if (!bookmark.getUser().getId().equals(userId)) {
                        throw new ResourceNotFoundException("Bookmark", bookmarkId);
                    }
                    User user = userRepository.getReferenceById(userId);
                    favoriteRepository.save(Favorite.builder().user(user).bookmark(bookmark).build());
                    return true;
                });
    }

    @Transactional(readOnly = true)
    public boolean isFavorited(UUID bookmarkId, UUID userId) {
        return favoriteRepository.existsByUserIdAndBookmarkId(userId, bookmarkId);
    }

    @Transactional(readOnly = true)
    public List<UUID> listIdsForUser(UUID userId) {
        return favoriteRepository.findBookmarkIdsByUserId(userId);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookmarkResponse> listForUser(UUID userId, Pageable pageable) {
        Page<Favorite> page = favoriteRepository.findByUserId(userId, pageable);
        return PageResponse.from(page.map(fav -> {
            var tags = bookmarkTagRepository.findByBookmarkId(fav.getBookmark().getId());
            return bookmarkMapper.toResponse(fav.getBookmark(), tags);
        }));
    }
}
