-- Add image_url column to words table for word images
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS image_url TEXT;