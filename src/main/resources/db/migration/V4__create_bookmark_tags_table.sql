CREATE TABLE bookmark_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bookmark_id UUID      NOT NULL REFERENCES bookmarks (id) ON DELETE CASCADE,
    tag_id      UUID      NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (bookmark_id, tag_id)
);

CREATE INDEX idx_bookmark_tags_bookmark_id ON bookmark_tags (bookmark_id);
CREATE INDEX idx_bookmark_tags_tag_id      ON bookmark_tags (tag_id);
