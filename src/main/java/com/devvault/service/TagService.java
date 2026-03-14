package com.devvault.service;

import com.devvault.dto.response.TagResponse;
import com.devvault.entity.Bookmark;
import com.devvault.entity.BookmarkTag;
import com.devvault.entity.Tag;
import com.devvault.enums.TagSource;
import com.devvault.exception.ResourceNotFoundException;
import com.devvault.repository.BookmarkRepository;
import com.devvault.repository.BookmarkTagRepository;
import com.devvault.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;
    private final BookmarkTagRepository bookmarkTagRepository;
    private final BookmarkRepository bookmarkRepository;

    @Transactional
    public void applyAiTags(Bookmark bookmark, List<String> tagNames) {
        for (String name : tagNames) {
            Tag tag = findOrCreate(name, TagSource.AI);
            if (!bookmarkTagRepository.existsByBookmarkAndTag(bookmark, tag)) {
                bookmarkTagRepository.save(BookmarkTag.builder()
                        .bookmark(bookmark)
                        .tag(tag)
                        .build());
            }
        }
    }

    @Transactional
    public void applyUserTags(Bookmark bookmark, Set<String> tagNames) {
        for (String name : tagNames) {
            Tag tag = findOrCreate(name, TagSource.USER);
            if (!bookmarkTagRepository.existsByBookmarkAndTag(bookmark, tag)) {
                bookmarkTagRepository.save(BookmarkTag.builder()
                        .bookmark(bookmark)
                        .tag(tag)
                        .build());
            }
        }
    }

    @Transactional
    public void removeTag(UUID bookmarkId, UUID tagId, UUID userId) {
        Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark", bookmarkId));

        if (!bookmark.getUser().getId().equals(userId)) {
            throw new SecurityException("Not authorized");
        }

        Tag tag = tagRepository.findById(tagId)
                .orElseThrow(() -> new ResourceNotFoundException("Tag", tagId));

        bookmarkTagRepository.deleteByBookmarkAndTag(bookmark, tag);
    }

    @Transactional(readOnly = true)
    public List<TagResponse> getTagsForBookmark(UUID bookmarkId) {
        return bookmarkTagRepository.findByBookmarkId(bookmarkId).stream()
                .map(bt -> TagResponse.builder()
                        .id(bt.getTag().getId())
                        .name(bt.getTag().getName())
                        .source(bt.getTag().getSource())
                        .build())
                .toList();
    }

    private Tag findOrCreate(String name, TagSource source) {
        return tagRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> tagRepository.save(Tag.builder()
                        .name(name.toLowerCase())
                        .source(source)
                        .build()));
    }
}
