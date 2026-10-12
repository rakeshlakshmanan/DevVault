package com.devvault.config;

import com.devvault.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Triggers reprocessing of any bookmarks that did not complete AI analysis
 * (e.g. due to a missing API key, server restart, or previous failure).
 *
 * <p>Runs once after the application context is fully started so that all
 * beans and the async executor are ready before processing begins. Runs on the
 * AI executor so scraping + Gemini calls for a backlog don't block the startup thread.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiStartupRunner {

    private final AiService aiService;

    @Async("aiTaskExecutor")
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("[AI] Checking for unfinished bookmark processing...");
        aiService.reprocessUnfinished();
    }
}
