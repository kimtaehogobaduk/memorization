
-- Create a SECURITY DEFINER function for checking group membership (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  );
$$;

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Group members can share vocabularies" ON public.group_vocabularies;

-- Create new INSERT policy using SECURITY DEFINER function to avoid RLS recursion
CREATE POLICY "Group members can share vocabularies"
ON public.group_vocabularies
FOR INSERT TO authenticated
WITH CHECK (
  shared_by = auth.uid()
  AND is_group_member(auth.uid(), group_id)
  AND EXISTS (
    SELECT 1 FROM vocabularies
    WHERE vocabularies.id = group_vocabularies.vocabulary_id
      AND vocabularies.user_id = auth.uid()
  )
);

-- Also update the SELECT policy to use the function
DROP POLICY IF EXISTS "Group members can view shared vocabularies" ON public.group_vocabularies;
CREATE POLICY "Group members can view shared vocabularies"
ON public.group_vocabularies
FOR SELECT TO authenticated
USING (is_group_member(auth.uid(), group_id));

-- Also update DELETE to be more explicit
DROP POLICY IF EXISTS "Sharers can delete their shared vocabularies" ON public.group_vocabularies;
CREATE POLICY "Sharers can delete their shared vocabularies"
ON public.group_vocabularies
FOR DELETE TO authenticated
USING (shared_by = auth.uid());

-- Allow admins to manage group vocabularies
CREATE POLICY "Admins can view all group vocabularies"
ON public.group_vocabularies
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
