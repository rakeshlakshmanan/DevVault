package com.devvault.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.devvault.service.ScraperService.ScrapedContent;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.InetAddress;
import org.junit.jupiter.api.Test;

class ScraperServiceTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String FAVICON = "https://www.google.com/s2/favicons?domain=example.com";

    @Test
    void jinaResponseWithTargetStatus403IsRejected() throws Exception {
        // Jina answers 200 but reports the site's refusal in data.httpStatus
        String json = """
                {"code":200,"data":{"title":"","description":"",
                "content":"You've been blocked by network security.",
                "warning":"Target URL returned error 403: Forbidden","httpStatus":403}}
                """;

        assertNull(ScraperService.parseJinaResponse(MAPPER, json, FAVICON));
    }

    @Test
    void jinaResponseWithTargetStatus404IsRejected() throws Exception {
        String json = """
                {"code":200,"data":{"title":"Not found","content":"Page not found","httpStatus":404}}
                """;

        assertNull(ScraperService.parseJinaResponse(MAPPER, json, FAVICON));
    }

    @Test
    void successfulJinaResponseIsParsed() throws Exception {
        String json = """
                {"code":200,"data":{"title":"Kubernetes","description":"Container orchestration",
                "content":"Kubernetes is an open-source system.","httpStatus":200}}
                """;

        ScrapedContent result = ScraperService.parseJinaResponse(MAPPER, json, FAVICON);

        assertNotNull(result);
        assertEquals("Kubernetes", result.title());
        assertEquals("Container orchestration", result.description());
        assertEquals("Kubernetes is an open-source system.", result.bodyText());
        assertEquals(FAVICON, result.faviconUrl());
    }

    @Test
    void jinaResponseWithoutHttpStatusIsAccepted() throws Exception {
        String json = """
                {"code":200,"data":{"title":"Page","content":"Some text"}}
                """;

        assertNotNull(ScraperService.parseJinaResponse(MAPPER, json, FAVICON));
    }

    @Test
    void jinaResponseWithNoUsableFieldsIsRejected() throws Exception {
        String json = """
                {"code":200,"data":{"title":"","description":"","content":"","httpStatus":200}}
                """;

        assertNull(ScraperService.parseJinaResponse(MAPPER, json, FAVICON));
    }

    @Test
    void longContentIsTruncated() throws Exception {
        String json = "{\"data\":{\"title\":\"T\",\"content\":\"" + "a".repeat(20_000) + "\"}}";

        ScrapedContent result = ScraperService.parseJinaResponse(MAPPER, json, FAVICON);

        assertEquals(8_000, result.bodyText().length());
    }

    @Test
    void nonPublicAddressesAreRefused() throws Exception {
        for (String ip : new String[] {
            "127.0.0.1", "10.0.0.5", "172.16.0.1", "192.168.1.1", "169.254.169.254",
            "0.0.0.0", "100.64.0.1", "::1", "fe80::1", "fc00::1", "fd12:3456::1"
        }) {
            assertFalse(ScraperService.isPublicAddress(InetAddress.getByName(ip)), ip);
        }
    }

    @Test
    void publicAddressesAreAllowed() throws Exception {
        for (String ip : new String[] {"8.8.8.8", "1.1.1.1", "151.101.1.69", "2606:4700:4700::1111"}) {
            assertTrue(ScraperService.isPublicAddress(InetAddress.getByName(ip)), ip);
        }
    }
}
