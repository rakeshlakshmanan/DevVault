package com.devvault.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

/**
 * Service responsible for scraping web page metadata from a given URL.
 *
 * <p>Uses the Jina AI Reader API ({@code https://r.jina.ai/}) to fetch fully-rendered
 * page content, bypassing bot-detection and JavaScript rendering issues that affect
 * direct Jsoup scraping on sites like Medium, Substack, etc.</p>
 *
 * <p>If Jina cannot read the page (the target site blocks it, or Jina itself refuses the
 * request), falls back to reading the page's own {@code og:} / {@code <title>} / description
 * tags directly. Failures are never reported as content, so a block page is not summarised.</p>
 *
 * <p>Uses Google's favicon service for favicons since Jina does not return them.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScraperService {

    private static final String JINA_BASE_URL = "https://r.jina.ai/";
    private static final int TIMEOUT_MS = 15_000;
    private static final int MAX_CONTENT_LENGTH = 8_000;
    private static final String USER_AGENT = "DevVault/1.0";
    private static final String BROWSER_USER_AGENT =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                    + "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";
    private static final int MAX_REDIRECTS = 3;
    private static final int MAX_BODY_BYTES = 1_000_000;

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
     * Fetches the given URL and extracts title, description and body text.
     *
     * <p>Tries Jina AI Reader first. If Jina cannot read the page, falls back to the page's
     * own metadata tags (title and description only). If both fail, only the favicon URL is
     * set and every other field is {@code null}.</p>
     *
     * @param url the URL to scrape
     * @return a {@link ScrapedContent} record with whatever could be extracted
     */
    public ScrapedContent scrape(String url) {
        String faviconUrl = buildFaviconUrl(url);

        ScrapedContent viaJina = scrapeViaJina(url, faviconUrl);
        if (viaJina != null) {
            return viaJina;
        }

        ScrapedContent viaMetadata = scrapeMetadata(url, faviconUrl);
        if (viaMetadata != null) {
            return viaMetadata;
        }

        return new ScrapedContent(null, null, faviconUrl, null);
    }

    private ScrapedContent scrapeViaJina(String url, String faviconUrl) {
        try {
            String jinaUrl = JINA_BASE_URL + url;
            log.debug("[Scraper] Fetching via Jina: {}", jinaUrl);

            // Jsoup's default User-Agent (an outdated Chrome string) is rejected by Jina's
            // Cloudflare front with HTTP 403, so identify ourselves explicitly.
            String json = Jsoup.connect(jinaUrl)
                    .userAgent(USER_AGENT)
                    .header("Accept", "application/json")
                    .ignoreContentType(true)
                    .timeout(TIMEOUT_MS)
                    .execute()
                    .body();

            return parseJinaResponse(objectMapper, json, faviconUrl);

        } catch (Exception e) {
            log.warn("[Scraper] Jina failed for URL: {} ({})", url, e.getMessage());
            return null;
        }
    }

    /**
     * Parses a Jina Reader JSON response.
     *
     * <p>Jina answers HTTP 200 even when the target site refused it, and puts the site's own
     * error or block page in {@code content} with the real status in {@code data.httpStatus}.
     * Those responses are rejected here so a block page is never treated as page content.</p>
     *
     * @return the extracted content, or {@code null} if the page could not be read
     */
    static ScrapedContent parseJinaResponse(ObjectMapper mapper, String json, String faviconUrl)
            throws IOException {
        JsonNode data = mapper.readTree(json).path("data");

        int targetStatus = data.path("httpStatus").asInt(200);
        if (targetStatus >= 400) {
            log.warn("[Scraper] Target site returned HTTP {} to Jina, ignoring its content", targetStatus);
            return null;
        }

        String title = nullIfBlank(data.path("title").asText(null));
        String description = nullIfBlank(data.path("description").asText(null));
        String content = data.path("content").asText("");
        if (content.length() > MAX_CONTENT_LENGTH) {
            content = content.substring(0, MAX_CONTENT_LENGTH);
        }

        if (title == null && description == null && content.isBlank()) {
            return null;
        }

        log.debug("[Scraper] title='{}' descriptionPresent={} contentLength={}",
                title, description != null, content.length());

        return new ScrapedContent(title, description, faviconUrl, content);
    }

    /**
     * Fallback: reads the page directly and extracts only its title and description tags.
     * The description doubles as body text so the AI has something real to summarise.
     */
    private ScrapedContent scrapeMetadata(String url, String faviconUrl) {
        try {
            Document doc = fetchPublicPage(url);

            String title = nullIfBlank(doc.select("meta[property=og:title]").attr("content"));
            if (title == null) {
                title = nullIfBlank(doc.title());
            }
            String description = nullIfBlank(doc.select("meta[property=og:description]").attr("content"));
            if (description == null) {
                description = nullIfBlank(doc.select("meta[name=description]").attr("content"));
            }
            if (title == null && description == null) {
                return null;
            }

            log.info("[Scraper] Used metadata fallback for URL: {}", url);
            return new ScrapedContent(title, description, faviconUrl, description);

        } catch (Exception e) {
            log.warn("[Scraper] Metadata fallback failed for URL: {} ({})", url, e.getMessage());
            return null;
        }
    }

    /**
     * Fetches a page directly, refusing to contact non-public addresses. Redirects are followed
     * manually so every hop is checked, otherwise a public URL could redirect into the cluster
     * network or the cloud metadata server.
     */
    private Document fetchPublicPage(String url) throws IOException {
        String current = url;
        for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
            URI uri = URI.create(current);
            String scheme = uri.getScheme();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                throw new IOException("Unsupported URL scheme");
            }
            requirePublicHost(uri.getHost());

            Connection.Response response = Jsoup.connect(current)
                    .userAgent(BROWSER_USER_AGENT)
                    .followRedirects(false)
                    .ignoreHttpErrors(true)
                    .maxBodySize(MAX_BODY_BYTES)
                    .timeout(TIMEOUT_MS)
                    .execute();

            int status = response.statusCode();
            if (status >= 300 && status < 400 && response.header("Location") != null) {
                current = uri.resolve(response.header("Location")).toString();
                continue;
            }
            if (status < 200 || status >= 300) {
                throw new IOException("HTTP " + status);
            }
            return response.parse();
        }
        throw new IOException("Too many redirects");
    }

    private static void requirePublicHost(String host) throws IOException {
        if (host == null || host.isBlank()) {
            throw new IOException("URL has no host");
        }
        for (InetAddress address : InetAddress.getAllByName(host)) {
            if (!isPublicAddress(address)) {
                throw new IOException("Refusing to fetch non-public address");
            }
        }
    }

    /** Whether the address is routable on the public internet. */
    static boolean isPublicAddress(InetAddress address) {
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return false;
        }
        byte[] b = address.getAddress();
        if (b.length == 4) {
            int first = b[0] & 0xff;
            int second = b[1] & 0xff;
            // 0.0.0.0/8 and carrier-grade NAT 100.64.0.0/10
            return first != 0 && !(first == 100 && (second & 0xc0) == 0x40);
        }
        // IPv6 unique-local fc00::/7
        return (b[0] & 0xfe) != 0xfc;
    }

    /**
     * Returns the Google favicon service URL for the given page URL's host.
     *
     * @param pageUrl the original page URL
     * @return the favicon URL, or {@code null} if the host cannot be parsed
     */
    private static String buildFaviconUrl(String pageUrl) {
        try {
            String host = new java.net.URL(pageUrl).getHost();
            return "https://www.google.com/s2/favicons?domain=" + host;
        } catch (Exception e) {
            return null;
        }
    }

    private static String nullIfBlank(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}
