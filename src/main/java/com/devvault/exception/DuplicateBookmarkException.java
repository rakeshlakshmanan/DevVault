package com.devvault.exception;

public class DuplicateBookmarkException extends RuntimeException {

    public DuplicateBookmarkException(String url) {
        super("Bookmark already exists for URL: " + url);
    }
}
