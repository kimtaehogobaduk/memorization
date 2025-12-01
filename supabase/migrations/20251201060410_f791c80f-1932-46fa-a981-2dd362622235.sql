-- Add indexes for quiz performance optimization
CREATE INDEX IF NOT EXISTS idx_words_vocabulary_id ON words(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_words_chapter_id ON words(chapter_id);
CREATE INDEX IF NOT EXISTS idx_words_vocabulary_chapter ON words(vocabulary_id, chapter_id);