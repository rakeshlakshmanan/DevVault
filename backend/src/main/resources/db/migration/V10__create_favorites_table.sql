CREATE TABLE favorites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bookmark_id UUID NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_favorites_user_bookmark UNIQUE (user_id, bookmark_id)
);

CREATE INDEX idx_favorites_user     ON favorites(user_id);
CREATE INDEX idx_favorites_bookmark ON favorites(bookmark_id);
