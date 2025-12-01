-- Fix infinite recursion in group_members RLS policies
-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Users can view members of accessible groups" ON group_members;

-- Create a simpler SELECT policy that doesn't cause recursion
-- Users can view members if they own the group OR if they are the member being viewed
CREATE POLICY "Users can view members of accessible groups"
ON group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_members.group_id 
    AND g.owner_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Also update the INSERT policy to be simpler
DROP POLICY IF EXISTS "Users can join groups" ON group_members;

CREATE POLICY "Users can join groups"
ON group_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);