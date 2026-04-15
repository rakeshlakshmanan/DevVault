package com.devvault.service;

import com.devvault.config.GeminiConfig;
import com.devvault.entity.Bookmark;
import com.devvault.enums.AiStatus;
import com.devvault.enums.TagSource;
import com.devvault.repository.BookmarkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Service that integrates with the Google Gemini API to generate AI-powered
 * summaries and tags for bookmarks.
 *
 * <p>Processing is performed asynchronously on a dedicated thread pool so that
 * bookmark creation is not blocked while waiting for the AI response.</p>
 */
@Service
@Slf4j
public class AiService {

    private final WebClient geminiWebClient;
    private final GeminiConfig geminiConfig;
    private final BookmarkRepository bookmarkRepository;
    private final TagService tagService;
    private final ScraperService scraperService;
    private final String geminiModel;

    public AiService(@Qualifier("geminiWebClient") WebClient geminiWebClient,
                     GeminiConfig geminiConfig,
                     BookmarkRepository bookmarkRepository,
                     TagService tagService,
                     ScraperService scraperService,
                     @Value("${app.gemini.model}") String geminiModel) {
        this.geminiWebClient = geminiWebClient;
        this.geminiConfig = geminiConfig;
        this.bookmarkRepository = bookmarkRepository;
        this.tagService = tagService;
        this.scraperService = scraperService;
        this.geminiModel = geminiModel;
    }

    /**
     * Asynchronously processes a bookmark by calling Gemini to generate a summary and tags.
     *
     * <p>The bookmark's {@code aiStatus} is set to {@code PROCESSING} while the API call is in
     * flight, then updated to {@code COMPLETED} or {@code FAILED} depending on the outcome.
     * AI-generated tags are applied via {@link TagService#applyAiTags} on success.</p>
     *
     * @param bookmarkId     the ID of the bookmark to process
     * @param scrapedContent the body text previously scraped from the bookmark URL
     */
    @Async("aiTaskExecutor")
    @Transactional
    public void processBookmark(UUID bookmarkId, String scrapedContent) {
        log.info("[AI] Starting processing for bookmark {}", bookmarkId);

        Bookmark bookmark = bookmarkRepository.findById(bookmarkId).orElse(null);
        if (bookmark == null) {
            log.warn("[AI] Bookmark {} not found, skipping", bookmarkId);
            return;
        }

        try {
            bookmark.setAiStatus(AiStatus.PROCESSING);
            bookmarkRepository.save(bookmark);
            log.info("[AI] Calling Gemini for bookmark {} (title='{}')", bookmarkId, bookmark.getTitle());

            AiResult result = callGemini(bookmark.getTitle(), scrapedContent);
            log.info("[AI] Gemini returned summary='{}' tags={}", result.summary(), result.tags());

            bookmark.setAiSummary(result.summary());
            bookmark.setAiStatus(AiStatus.COMPLETED);
            bookmarkRepository.save(bookmark);

            tagService.applyAiTags(bookmark, result.tags());
            log.info("[AI] Successfully processed bookmark {}", bookmarkId);

        } catch (Exception e) {
            log.error("[AI] Processing failed for bookmark {}", bookmarkId, e);
            bookmark.setAiStatus(AiStatus.FAILED);
            bookmarkRepository.save(bookmark);
        }
    }

    /**
     * Finds all bookmarks that are not yet {@code COMPLETED} (i.e. {@code PENDING},
     * {@code PROCESSING}, or {@code FAILED}) and re-scrapes + reprocesses each one.
     *
     * <p>Intended to be called on application startup to recover bookmarks that missed
     * AI processing (e.g. server was down, API key was missing, or the call failed).</p>
     */
    public void reprocessUnfinished() {
        List<AiStatus> incomplete = List.of(AiStatus.PENDING, AiStatus.PROCESSING, AiStatus.FAILED);
        java.util.Set<UUID> queued = new java.util.HashSet<>();
        int processed = 0;

        for (AiStatus status : incomplete) {
            int page = 0;
            Page<Bookmark> batch;
            do {
                batch = bookmarkRepository.findByAiStatus(status, PageRequest.of(page, 50));
                for (Bookmark bookmark : batch.getContent()) {
                    if (!queued.add(bookmark.getId())) {
                        log.debug("[AI] Skipping already-queued bookmark {} (status={})", bookmark.getId(), status);
                        continue;
                    }
                    log.info("[AI] Reprocessing bookmark {} (status={})", bookmark.getId(), status);
                    bookmark.setAiStatus(AiStatus.PENDING);
                    bookmarkRepository.save(bookmark);

                    String scraped = scraperService.scrape(bookmark.getUrl()).bodyText();
                    processBookmark(bookmark.getId(), scraped);
                    processed++;
                }
                page++;
            } while (batch.hasNext());
        }

        if (processed == 0) {
            log.info("[AI] No unfinished bookmarks found — nothing to reprocess");
        } else {
            log.info("[AI] Queued {} bookmark(s) for reprocessing", processed);
        }
    }

    /**
     * Calls the Gemini {@code generateContent} endpoint with a structured prompt
     * and returns the parsed {@link AiResult}.
     *
     * @param title   the bookmark title, used to give the model context
     * @param content the scraped body text of the bookmarked page
     * @return an {@link AiResult} containing the summary and tag list
     */
    private AiResult callGemini(String title, String content) {
        String prompt = buildPrompt(title, content);
        log.debug("[AI] Using model={} apiKeyPresent={}", geminiModel, geminiConfig.getApiKey() != null && !geminiConfig.getApiKey().isBlank());

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                ))
        );

        String response = geminiWebClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/models/{model}:generateContent")
                        .queryParam("key", geminiConfig.getApiKey())
                        .build(geminiModel))
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(), clientResponse ->
                        clientResponse.bodyToMono(String.class).map(body -> {
                            log.error("[AI] Gemini API returned HTTP {} — body: {}", clientResponse.statusCode(), body);
                            return new RuntimeException("Gemini API error " + clientResponse.statusCode() + ": " + body);
                        }))
                .bodyToMono(String.class)
                .block();

        log.debug("[AI] Raw Gemini response: {}", response);
        return parseGeminiResponse(response);
    }

    /**
     * Builds the text prompt sent to Gemini, requesting a 2–3 sentence summary
     * and 3–5 comma-separated tags in a fixed {@code SUMMARY: / TAGS:} format.
     *
     * @param title   the bookmark title (may be {@code null})
     * @param content the scraped page content (may be {@code null})
     * @return the formatted prompt string
     */
    private String buildPrompt(String title, String content) {
        return """
                Analyze the following web content and provide:
                1. A concise summary (2-3 sentences)
                2. 3-5 relevant tags (single words or short phrases)

                Respond in exactly this format:
                SUMMARY: <your summary here>
                TAGS: <tag1>, <tag2>, <tag3>

                Title: %s
                Content: %s
                """.formatted(title != null ? title : "Unknown", content != null ? content : "");
    }

    /**
     * Parses the raw JSON string returned by Gemini to extract the summary and tags.
     *
     * <p>Looks for the first {@code "text"} field in the response JSON and splits it
     * on the {@code SUMMARY:} and {@code TAGS:} markers. Returns an empty
     * {@link AiResult} if parsing fails.</p>
     *
     * @param rawResponse the raw JSON response body from the Gemini API
     * @return the parsed {@link AiResult}, or an empty result if parsing fails
     */
    private AiResult parseGeminiResponse(String rawResponse) {
        // Basic parsing — extract text from Gemini JSON response
        // In production, use a proper JSON parser
        try {
            int textStart = rawResponse.indexOf("\"text\": \"") + 9;
            int textEnd = rawResponse.indexOf("\"", textStart);
            String text = rawResponse.substring(textStart, textEnd)
                    .replace("\\n", "\n");

            log.debug("[AI] Extracted text block: {}", text);

            String summary = "";
            List<String> tags = List.of();

            for (String line : text.split("\n")) {
                if (line.startsWith("SUMMARY:")) {
                    summary = line.substring("SUMMARY:".length()).trim();
                } else if (line.startsWith("TAGS:")) {
                    String tagLine = line.substring("TAGS:".length()).trim();
                    tags = List.of(tagLine.split(",")).stream()
                            .map(String::trim)
                            .filter(t -> !t.isBlank())
                            .toList();
                }
            }

            if (summary.isBlank() && tags.isEmpty()) {
                log.warn("[AI] Parsed response has no summary or tags — raw text block was: {}", text);
            }

            return new AiResult(summary, tags);
        } catch (Exception e) {
            log.warn("[AI] Failed to parse Gemini response — rawResponse: {}", rawResponse, e);
            return new AiResult("", List.of());
        }
    }

    /**
     * Holds the AI-generated output for a single bookmark.
     *
     * @param summary a 2–3 sentence plain-text summary of the bookmarked content
     * @param tags    a list of 3–5 short tag strings suggested by the model
     */
    public record AiResult(String summary, List<String> tags) {}
}
