package com.devvault.event;

import java.util.UUID;

/**
 * Published after a bookmark is persisted, carrying the data needed for async AI processing.
 * Consumed by {@link com.devvault.service.AiService} via a {@code @TransactionalEventListener}
 * so that AI processing only starts after the creating transaction has committed.
 *
 * @param bookmarkId     the ID of the newly created bookmark
 * @param scrapedContent the body text scraped from the bookmark URL
 */
public record BookmarkCreatedEvent(UUID bookmarkId, String scrapedContent) {}
