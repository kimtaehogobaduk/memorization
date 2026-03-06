
ALTER TABLE public.words 
  ADD COLUMN IF NOT EXISTS frequency integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS synonyms text DEFAULT null,
  ADD COLUMN IF NOT EXISTS antonyms text DEFAULT null,
  ADD COLUMN IF NOT EXISTS derivatives jsonb DEFAULT null;
