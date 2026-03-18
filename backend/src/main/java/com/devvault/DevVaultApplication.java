package com.devvault;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class DevVaultApplication {

    public static void main(String[] args) {
        SpringApplication.run(DevVaultApplication.class, args);
    }
}