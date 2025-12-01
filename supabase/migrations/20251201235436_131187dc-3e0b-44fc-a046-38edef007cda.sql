-- Allow group members to view vocabularies shared in their groups
CREATE POLICY "Group members can view shared vocabularies"
ON public.vocabularies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_vocabularies gv
    JOIN public.group_members gm ON gm.group_id = gv.group_id
    WHERE gv.vocabulary_id = vocabularies.id
      AND gm.user_id = auth.uid()
  )
);

-- Allow group members to view words from vocabularies shared in their groups
CREATE POLICY "Group members can view words from shared vocabularies"
ON public.words
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_vocabularies gv
    JOIN public.group_members gm ON gm.group_id = gv.group_id
    WHERE gv.vocabulary_id = words.vocabulary_id
      AND gm.user_id = auth.uid()
  )
);

-- Allow group members to view chapters from vocabularies shared in their groups
CREATE POLICY "Group members can view chapters from shared vocabularies"
ON public.chapters
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_vocabularies gv
    JOIN public.group_members gm ON gm.group_id = gv.group_id
    WHERE gv.vocabulary_id = chapters.vocabulary_id
      AND gm.user_id = auth.uid()
  )
);