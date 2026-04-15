package com.devvault.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;

/**
 * Service responsible for scraping web page metadata from a given URL.
 *
 * <p>Uses the Jina AI Reader API ({@code https://r.jina.ai/}) to fetch fully-rendered
 * page content, bypassing bot-detection and JavaScript rendering issues that affect
 * direct Jsoup scraping on sites like Medium, Substack, etc.</p>
 *
 * <p>Falls back to Google's favicon service for favicons since Jina does not return them.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScraperService {

    private static final String JINA_BASE_URL = "https://r.jina.ai/";
    private static final int TIMEOUT_MS = 15_000;
    private static final int MAX_CONTENT_LENGTH = 8_000;

    private final ObjectMapper objectMapper;

    /**
     * Holds the scraped metadata extracted from a web page.
     *
     * @param title       the page title
     * @param description a short description of the page
     * @param faviconUrl  the URL of the page's favicon (via Google's favicon service)
     * @param bodyText    the visible body text, truncated to {@value MAX_CONTENT_LENGTH} characters
     */
    public record ScrapedContent(String title, String description, String faviconUrl, String bodyText) {}

    /**
     * Fetches and parses the given URL via Jina AI Reader, extracting title, description,
     * and body text. Favicon is resolved via Google's favicon service.
     *
     * <p>If the request fails (e.g. network error, timeout), all fields in the returned
     * {@link ScrapedContent} will be {@code null} and the error is logged as a warning.</p>
     *
     * @param url the URL to scrape
     * @return a {@link ScrapedContent} record with extracted metadata, or all-null fields on failure
     */
    public ScrapedContent scrape(String url) {
        try {
            String jinaUrl = JINA_BASE_URL + url;
            log.debug("[Scraper] Fetching via Jina: {}", jinaUrl);

            String json = Jsoup.connect(jinaUrl)
                    .header("Accept", "application/json")
                    .ignoreContentType(true)
                    .timeout(TIMEOUT_MS)
                    .execute()
                    .body();

            JsonNode data = objectMapper.readTree(json).path("data");

            String title = nullIfBlank(data.path("title").asText(null));
            String description = nullIfBlank(data.path("description").asText(null));
            String content = data.path("content").asText("");
            if (content.length() > MAX_CONTENT_LENGTH) {
                content = content.substring(0, MAX_CONTENT_LENGTH);
            }

            String faviconUrl = buildFaviconUrl(url);

            log.debug("[Scraper] title='{}' descriptionPresent={} contentLength={}",
                    title, description != null, content.length());

            return new ScrapedContent(title, description, faviconUrl, content);

        } catch (Exception e) {
            log.warn("[Scraper] Failed to scrape URL: {}", url, e);
            return new ScrapedContent(null, null, null, null);
        }
    }

    /**
     * Returns the Google favicon service URL for the given page URL's host.
     *
     * @param pageUrl the original page URL
     * @return the favicon URL, or {@code null} if the host cannot be parsed
     */
    private String buildFaviconUrl(String pageUrl) {
        try {
            String host = new java.net.URL(pageUrl).getHost();
            return "https://www.google.com/s2/favicons?domain=" + host;
        } catch (Exception e) {
            return null;
        }
    }

    private String nullIfBlank(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}
