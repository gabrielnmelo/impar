-- Migration 0003: proposals table.

CREATE TABLE IF NOT EXISTS proposals (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL DEFAULT '',
  client_name    TEXT NOT NULL DEFAULT '',
  body_html      TEXT NOT NULL DEFAULT '',
  line_items     TEXT NOT NULL DEFAULT '[]',   -- JSON: [{description, qty, unit_price}]
  valid_until    INTEGER,                       -- ms timestamp (date only, end-of-day)
  payment_terms  TEXT NOT NULL DEFAULT '',
  timeline       TEXT NOT NULL DEFAULT '',
  scope_in       TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  scope_out      TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent')),
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  sent_at        INTEGER,
  author_email   TEXT
);

CREATE INDEX IF NOT EXISTS idx_proposals_updated
  ON proposals(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposals_status
  ON proposals(status, updated_at DESC);
