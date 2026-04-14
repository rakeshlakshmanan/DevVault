package com.devvault.service;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Service responsible for scraping web page metadata from a given URL.
 *
 * <p>Uses Jsoup to fetch and parse HTML, extracting Open Graph tags, meta
 * descriptions, favicons, and body text for use in bookmark creation and AI processing.</p>
 */
@Service
@Slf4j
public class ScraperService {

    private static final int TIMEOUT_MS = 10_000;
    private static final int MAX_CONTENT_LENGTH = 8_000;

    /**
     * Holds the scraped metadata extracted from a web page.
     *
     * @param title       the page title (from og:title or {@code <title>})
     * @param description the page description (from og:description or meta description)
     * @param faviconUrl  the URL of the page's favicon
     * @param bodyText    the visible body text, truncated to {@value MAX_CONTENT_LENGTH} characters
     */
    public record ScrapedContent(String title, String description, String faviconUrl, String bodyText) {}

    /**
     * Fetches and parses the given URL, extracting title, description, favicon, and body text.
     *
     * <p>If the request fails (e.g. network error, timeout), all fields in the returned
     * {@link ScrapedContent} will be {@code null} and the error is logged as a warning.</p>
     *
     * @param url the URL to scrape
     * @return a {@link ScrapedContent} record with extracted metadata, or all-null fields on failure
     */
    public ScrapedContent scrape(String url) {
        try {
            Document doc = Jsoup.connect(url)
                    .timeout(TIMEOUT_MS)
                    .userAgent("Mozilla/5.0 (compatible; DevVault/1.0)")
                    .get();

            String title = extractTitle(doc);
            String description = extractDescription(doc);
            String faviconUrl = extractFavicon(doc, url);
            String bodyText = extractBodyText(doc);

            return new ScrapedContent(title, description, faviconUrl, bodyText);
        } catch (IOException e) {
            log.warn("Failed to scrape URL: {}", url, e);
            return new ScrapedContent(null, null, null, null);
        }
    }

    /**
     * Extracts the page title, preferring the {@code og:title} Open Graph meta tag
     * over the HTML {@code <title>} element.
     *
     * @param doc the parsed Jsoup document
     * @return the extracted title, or the document title as fallback
     */
    private String extractTitle(Document doc) {
        String ogTitle = doc.selectFirst("meta[property=og:title]") != null
                ? doc.selectFirst("meta[property=og:title]").attr("content")
                : null;
        return ogTitle != null && !ogTitle.isBlank() ? ogTitle : doc.title();
    }

    /**
     * Extracts the page description from {@code og:description} or the standard
     * {@code meta[name=description]} tag, in that priority order.
     *
     * @param doc the parsed Jsoup document
     * @return the description string, or {@code null} if none is found
     */
    private String extractDescription(Document doc) {
        var ogDesc = doc.selectFirst("meta[property=og:description]");
        if (ogDesc != null && !ogDesc.attr("content").isBlank()) {
            return ogDesc.attr("content");
        }
        var metaDesc = doc.selectFirst("meta[name=description]");
        return metaDesc != null ? metaDesc.attr("content") : null;
    }

    /**
     * Extracts the favicon URL from the page's {@code <link rel="icon">} tag.
     * Falls back to Google's favicon service ({@code google.com/s2/favicons}) if none is found.
     *
     * @param doc     the parsed Jsoup document
     * @param baseUrl the original page URL, used to resolve the favicon host for the fallback
     * @return the absolute favicon URL, or {@code null} if it cannot be determined
     */
    private String extractFavicon(Document doc, String baseUrl) {
        var link = doc.selectFirst("link[rel~=icon]");
        if (link != null) {
            String href = link.absUrl("href");
            return href.isBlank() ? null : href;
        }
        // Fallback to Google's favicon service
        try {
            String host = new java.net.URL(baseUrl).getHost();
            return "https://www.google.com/s2/favicons?domain=" + host;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Extracts visible body text from the document, truncating to
     * {@value MAX_CONTENT_LENGTH} characters to limit AI prompt size.
     *
     * @param doc the parsed Jsoup document
     * @return the (possibly truncated) visible body text
     */
    private String extractBodyText(Document doc) {
        String text = doc.body().text();
        return text.length() > MAX_CONTENT_LENGTH ? text.substring(0, MAX_CONTENT_LENGTH) : text;
    }
}
