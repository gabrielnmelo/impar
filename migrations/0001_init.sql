-- Migration 0001: posts table.

CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  tags          TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  body_html     TEXT NOT NULL DEFAULT '',
  excerpt       TEXT NOT NULL DEFAULT '',
  image_key     TEXT,                          -- R2 object key (or NULL)
  read_minutes  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  published_at  INTEGER,
  author_email  TEXT
);

CREATE INDEX IF NOT EXISTS idx_posts_published
  ON posts(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_updated
  ON posts(updated_at DESC);
