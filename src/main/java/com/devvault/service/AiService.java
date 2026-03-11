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
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class AiService {

    private final WebClient geminiWebClient;
    private final GeminiConfig geminiConfig;
    private final BookmarkRepository bookmarkRepository;
    private final TagService tagService;
    private final String geminiModel;

    public AiService(@Qualifier("geminiWebClient") WebClient geminiWebClient,
                     GeminiConfig geminiConfig,
                     BookmarkRepository bookmarkRepository,
                     TagService tagService,
                     @Value("${app.gemini.model}") String geminiModel) {
        this.geminiWebClient = geminiWebClient;
        this.geminiConfig = geminiConfig;
        this.bookmarkRepository = bookmarkRepository;
        this.tagService = tagService;
        this.geminiModel = geminiModel;
    }

    @Async("aiTaskExecutor")
    @Transactional
    public void processBookmark(UUID bookmarkId, String scrapedContent) {
        Bookmark bookmark = bookmarkRepository.findById(bookmarkId).orElse(null);
        if (bookmark == null) return;

        try {
            bookmark.setAiStatus(AiStatus.PROCESSING);
            bookmarkRepository.save(bookmark);

            AiResult result = callGemini(bookmark.getTitle(), scrapedContent);

            bookmark.setAiSummary(result.summary());
            bookmark.setAiStatus(AiStatus.COMPLETED);
            bookmarkRepository.save(bookmark);

            tagService.applyAiTags(bookmark, result.tags());

        } catch (Exception e) {
            log.error("AI processing failed for bookmark {}", bookmarkId, e);
            bookmark.setAiStatus(AiStatus.FAILED);
            bookmarkRepository.save(bookmark);
        }
    }

    private AiResult callGemini(String title, String content) {
        String prompt = buildPrompt(title, content);

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
                .bodyToMono(String.class)
                .block();

        return parseGeminiResponse(response);
    }

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

    private AiResult parseGeminiResponse(String rawResponse) {
        // Basic parsing — extract text from Gemini JSON response
        // In production, use a proper JSON parser
        try {
            int textStart = rawResponse.indexOf("\"text\": \"") + 9;
            int textEnd = rawResponse.indexOf("\"", textStart);
            String text = rawResponse.substring(textStart, textEnd)
                    .replace("\\n", "\n");

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
            return new AiResult(summary, tags);
        } catch (Exception e) {
            log.warn("Failed to parse Gemini response", e);
            return new AiResult("", List.of());
        }
    }

    public record AiResult(String summary, List<String> tags) {}
}
