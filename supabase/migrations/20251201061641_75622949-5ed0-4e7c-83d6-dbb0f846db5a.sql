-- Add admin policies for full data access

-- Admins can view all vocabularies
CREATE POLICY "Admins can view all vocabularies"
ON public.vocabularies
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete any vocabulary
CREATE POLICY "Admins can delete any vocabulary"
ON public.vocabularies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all words
CREATE POLICY "Admins can view all words"
ON public.words
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete any word
CREATE POLICY "Admins can delete any words"
ON public.words
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all groups
CREATE POLICY "Admins can view all groups"
ON public.groups
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete any group
CREATE POLICY "Admins can delete any group"
ON public.groups
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all group members
CREATE POLICY "Admins can view all group members"
ON public.group_members
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete any group member
CREATE POLICY "Admins can delete any group member"
ON public.group_members
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all study progress
CREATE POLICY "Admins can view all study progress"
ON public.study_progress
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));