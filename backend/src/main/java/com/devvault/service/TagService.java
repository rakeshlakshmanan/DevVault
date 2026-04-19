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

/**
 * Service for managing tags on bookmarks.
 *
 * <p>Handles creation of new tags (or reuse of existing ones) and the association
 * of tags to bookmarks, supporting both user-supplied and AI-generated tag sources.</p>
 */
@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;
    private final BookmarkTagRepository bookmarkTagRepository;
    private final BookmarkRepository bookmarkRepository;

    /**
     * Associates a list of AI-generated tags with a bookmark.
     *
     * <p>Each tag name is looked up case-insensitively; a new {@link Tag} with
     * {@link TagSource#AI} is created if it does not already exist. Duplicate
     * associations are silently skipped.</p>
     *
     * @param bookmark the bookmark to tag
     * @param tagNames the list of tag names produced by the AI
     */
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

    /**
     * Associates a set of user-supplied tags with a bookmark.
     *
     * <p>Each tag name is looked up case-insensitively; a new {@link Tag} with
     * {@link TagSource#USER} is created if it does not already exist. Duplicate
     * associations are silently skipped.</p>
     *
     * @param bookmark the bookmark to tag
     * @param tagNames the set of tag names provided by the user
     */
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

    /**
     * Removes a tag association from a bookmark, enforcing ownership.
     *
     * @param bookmarkId the ID of the bookmark
     * @param tagId      the ID of the tag to remove
     * @param userId     the ID of the requesting user; must be the bookmark owner
     * @throws ResourceNotFoundException if the bookmark or tag does not exist
     * @throws SecurityException         if the requesting user does not own the bookmark
     */
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

    /**
     * Returns all tags associated with the given bookmark.
     *
     * @param bookmarkId the ID of the bookmark
     * @return a list of {@link TagResponse} DTOs for all tags on the bookmark
     */
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

    /**
     * Removes tags that are no longer associated with any bookmark.
     *
     * <p>Called after a bookmark is deleted to keep the tags table clean.</p>
     */
    @Transactional
    public void deleteOrphanedTags() {
        tagRepository.deleteOrphanedTags();
    }

    /**
     * Looks up a tag by name (case-insensitive) or creates a new one with the given source.
     *
     * <p>The tag name is stored in lower-case to ensure consistent deduplication.</p>
     *
     * @param name   the tag name
     * @param source the origin of the tag ({@link TagSource#AI} or {@link TagSource#USER})
     * @return the existing or newly created {@link Tag}
     */
    private Tag findOrCreate(String name, TagSource source) {
        return tagRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> tagRepository.save(Tag.builder()
                        .name(name.toLowerCase())
                        .source(source)
                        .build()));
    }
}
