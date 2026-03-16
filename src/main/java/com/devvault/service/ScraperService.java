package com.devvault.service;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@Slf4j
public class ScraperService {

    private static final int TIMEOUT_MS = 10_000;
    private static final int MAX_CONTENT_LENGTH = 8_000;

    public record ScrapedContent(String title, String description, String faviconUrl, String bodyText) {}

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

    private String extractTitle(Document doc) {
        String ogTitle = doc.selectFirst("meta[property=og:title]") != null
                ? doc.selectFirst("meta[property=og:title]").attr("content")
                : null;
        return ogTitle != null && !ogTitle.isBlank() ? ogTitle : doc.title();
    }

    private String extractDescription(Document doc) {
        var ogDesc = doc.selectFirst("meta[property=og:description]");
        if (ogDesc != null && !ogDesc.attr("content").isBlank()) {
            return ogDesc.attr("content");
        }
        var metaDesc = doc.selectFirst("meta[name=description]");
        return metaDesc != null ? metaDesc.attr("content") : null;
    }

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

    private String extractBodyText(Document doc) {
        String text = doc.body().text();
        return text.length() > MAX_CONTENT_LENGTH ? text.substring(0, MAX_CONTENT_LENGTH) : text;
    }
}
