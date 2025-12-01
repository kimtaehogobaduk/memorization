-- Create word-images storage bucket for word image uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('word-images', 'word-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for word-images bucket
CREATE POLICY "Anyone can view word images"
ON storage.objects FOR SELECT
USING (bucket_id = 'word-images');

CREATE POLICY "Authenticated users can upload word images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'word-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own word images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'word-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own word images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'word-images' 
  AND auth.role() = 'authenticated'
);