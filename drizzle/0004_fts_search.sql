-- FTS5 virtual table for transcript search
CREATE VIRTUAL TABLE IF NOT EXISTS transcript_fts USING fts5(
  module_id,
  course_id,
  title,
  content,
  content_rowid='id',
  tokenize='unicode61'
);
