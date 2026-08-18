CREATE TABLE IF NOT EXISTS background_documents (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,
  blocks_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS background_documents_updated_at_index
  ON background_documents(updated_at);
