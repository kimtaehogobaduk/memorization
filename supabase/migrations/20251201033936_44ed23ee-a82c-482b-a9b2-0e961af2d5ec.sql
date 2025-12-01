-- Add cover_image_url to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Create storage bucket for group images
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-images', 'group-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for group images
CREATE POLICY "Anyone can view group images"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-images');

CREATE POLICY "Group owners can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'group-images' 
  AND auth.uid() IN (
    SELECT owner_id FROM public.groups 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Group owners can update images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'group-images'
  AND auth.uid() IN (
    SELECT owner_id FROM public.groups 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Group owners can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'group-images'
  AND auth.uid() IN (
    SELECT owner_id FROM public.groups 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Create polls table for voting feature
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  end_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view polls"
ON public.polls FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = polls.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Group owners can create polls"
ON public.polls FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = polls.group_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Poll creators can update polls"
ON public.polls FOR UPDATE
USING (creator_id = auth.uid());

CREATE POLICY "Poll creators can delete polls"
ON public.polls FOR DELETE
USING (creator_id = auth.uid());

-- Create poll_votes table
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes in their groups"
ON public.poll_votes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.polls p
    JOIN public.group_members gm ON p.group_id = gm.group_id
    WHERE p.id = poll_votes.poll_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own votes"
ON public.poll_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
ON public.poll_votes FOR UPDATE
USING (auth.uid() = user_id);

-- Create group_vocabularies for sharing vocabularies to groups
CREATE TABLE IF NOT EXISTS public.group_vocabularies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  vocabulary_id uuid NOT NULL REFERENCES public.vocabularies(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(group_id, vocabulary_id)
);

ALTER TABLE public.group_vocabularies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view shared vocabularies"
ON public.group_vocabularies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_vocabularies.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Group members can share vocabularies"
ON public.group_vocabularies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_vocabularies.group_id AND user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.vocabularies
    WHERE id = group_vocabularies.vocabulary_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Sharers can delete their shared vocabularies"
ON public.group_vocabularies FOR DELETE
USING (shared_by = auth.uid());

-- Create group_messages for chat feature
CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view messages"
ON public.group_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_messages.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Group members can send messages"
ON public.group_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_messages.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Message senders can delete their messages"
ON public.group_messages FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Add co_owners column to groups for co-leader feature
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS co_owners uuid[] DEFAULT '{}';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_polls_group_id ON public.polls(group_id);
CREATE INDEX IF NOT EXISTS idx_group_vocabularies_group_id ON public.group_vocabularies(group_id);