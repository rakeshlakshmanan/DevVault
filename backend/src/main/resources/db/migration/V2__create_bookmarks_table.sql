CREATE TABLE bookmarks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    url           VARCHAR(2048) NOT NULL,
    title         VARCHAR(512),
    description   TEXT,
    favicon_url   TEXT,
    content_type  VARCHAR(20),
    ai_status     VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    ai_summary    TEXT,
    is_public     BOOLEAN      NOT NULL DEFAULT FALSE,
    search_vector TSVECTOR,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, url)
);

CREATE INDEX idx_bookmarks_user_id     ON bookmarks (user_id);
CREATE INDEX idx_bookmarks_ai_status   ON bookmarks (ai_status);
CREATE INDEX idx_bookmarks_created_at  ON bookmarks (created_at DESC);
CREATE INDEX idx_bookmarks_search      ON bookmarks USING GIN (search_vector);

-- Trigger to maintain search_vector
CREATE OR REPLACE FUNCTION bookmarks_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.ai_summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookmarks_search_vector_trigger
    BEFORE INSERT OR UPDATE ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION bookmarks_search_vector_update();
