-- Create bookshelves table for organizing vocabularies
CREATE TABLE IF NOT EXISTS public.bookshelves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bookshelf_vocabularies junction table
CREATE TABLE IF NOT EXISTS public.bookshelf_vocabularies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bookshelf_id UUID NOT NULL REFERENCES public.bookshelves(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES public.vocabularies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(bookshelf_id, vocabulary_id)
);

-- Enable RLS
ALTER TABLE public.bookshelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookshelf_vocabularies ENABLE ROW LEVEL SECURITY;

-- Bookshelves RLS policies
CREATE POLICY "Users can view own bookshelves"
  ON public.bookshelves FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookshelves"
  ON public.bookshelves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookshelves"
  ON public.bookshelves FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookshelves"
  ON public.bookshelves FOR DELETE
  USING (auth.uid() = user_id);

-- Bookshelf vocabularies RLS policies
CREATE POLICY "Users can view own bookshelf vocabularies"
  ON public.bookshelf_vocabularies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookshelves
      WHERE id = bookshelf_vocabularies.bookshelf_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add vocabularies to own bookshelves"
  ON public.bookshelf_vocabularies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookshelves
      WHERE id = bookshelf_vocabularies.bookshelf_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove vocabularies from own bookshelves"
  ON public.bookshelf_vocabularies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookshelves
      WHERE id = bookshelf_vocabularies.bookshelf_id
      AND user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_bookshelves_updated_at
  BEFORE UPDATE ON public.bookshelves
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_bookshelves_user_id ON public.bookshelves(user_id);
CREATE INDEX idx_bookshelf_vocabularies_bookshelf_id ON public.bookshelf_vocabularies(bookshelf_id);
CREATE INDEX idx_bookshelf_vocabularies_vocabulary_id ON public.bookshelf_vocabularies(vocabulary_id);