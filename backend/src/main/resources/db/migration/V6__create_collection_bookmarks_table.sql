CREATE TABLE collection_bookmarks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID      NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
    bookmark_id   UUID      NOT NULL REFERENCES bookmarks (id) ON DELETE CASCADE,
    added_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (collection_id, bookmark_id)
);

CREATE INDEX idx_collection_bookmarks_collection_id ON collection_bookmarks (collection_id);
CREATE INDEX idx_collection_bookmarks_bookmark_id   ON collection_bookmarks (bookmark_id);
