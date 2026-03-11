package com.devvault.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class GeminiConfig {

    @Value("${app.gemini.api-key}")
    private String apiKey;

    @Value("${app.gemini.base-url}")
    private String baseUrl;

    @Bean(name = "geminiWebClient")
    public WebClient geminiWebClient() {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    public String getApiKey() {
        return apiKey;
    }
}
