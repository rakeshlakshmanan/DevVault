-- Counts AI processing attempts so permanently failing bookmarks stop being retried on every startup
ALTER TABLE bookmarks ADD COLUMN ai_attempts INT NOT NULL DEFAULT 0;
