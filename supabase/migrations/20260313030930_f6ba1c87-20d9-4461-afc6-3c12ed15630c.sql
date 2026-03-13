
-- Fix: Allow all group members to see other members in the same group
DROP POLICY IF EXISTS "Users can view members of accessible groups" ON public.group_members;

CREATE POLICY "Users can view members of accessible groups"
ON public.group_members
FOR SELECT TO public
USING (
  is_group_member(auth.uid(), group_id)
);
