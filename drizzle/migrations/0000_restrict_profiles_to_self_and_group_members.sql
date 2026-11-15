DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own and shared group profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1
    FROM public.group_members AS gm
    WHERE gm.user_id = profiles.id
      AND public.is_group_member(auth.uid(), gm.group_id)
  )
);