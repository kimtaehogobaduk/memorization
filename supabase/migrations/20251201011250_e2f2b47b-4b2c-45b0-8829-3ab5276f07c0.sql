-- Create chapters table
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vocabulary_id UUID NOT NULL REFERENCES public.vocabularies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on chapters
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Chapters policies
CREATE POLICY "Users can view chapters from accessible vocabularies"
  ON public.chapters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vocabularies v
      WHERE v.id = chapters.vocabulary_id
      AND (v.user_id = auth.uid() OR v.is_public = true)
    )
  );

CREATE POLICY "Users can create chapters in own vocabularies"
  ON public.chapters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vocabularies v
      WHERE v.id = vocabulary_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chapters in own vocabularies"
  ON public.chapters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.vocabularies v
      WHERE v.id = vocabulary_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chapters in own vocabularies"
  ON public.chapters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.vocabularies v
      WHERE v.id = vocabulary_id AND v.user_id = auth.uid()
    )
  );

-- Add chapter_id to words table
ALTER TABLE public.words ADD COLUMN chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL;

-- Create trigger for chapters updated_at
CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_chapters_vocabulary_id ON public.chapters(vocabulary_id);
CREATE INDEX idx_words_chapter_id ON public.words(chapter_id);