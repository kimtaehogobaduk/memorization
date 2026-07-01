
-- 1. Protect groups.join_code from broad reads.
REVOKE SELECT (join_code) ON public.groups FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_group_join_code(_group_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.join_code
  FROM public.groups g
  WHERE g.id = _group_id
    AND (
      g.owner_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = g.id
          AND gm.user_id = auth.uid()
          AND gm.role IN ('owner','co_owner','admin')
      )
    );
$$;
REVOKE EXECUTE ON FUNCTION public.get_group_join_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_join_code(uuid) TO authenticated;

-- 2. word-images: enforce ownership on delete/update via first path segment.
DROP POLICY IF EXISTS "Users can delete their own word images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own word images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload word images" ON storage.objects;

CREATE POLICY "Users can upload their own word images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'word-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own word images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'word-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own word images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'word-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3. Restrict avatar write policies to authenticated only (not anon/public).
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4. Group-images write policies restricted to authenticated.
DROP POLICY IF EXISTS "Group owners can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Group owners can update images" ON storage.objects;
DROP POLICY IF EXISTS "Group owners can delete images" ON storage.objects;

CREATE POLICY "Group owners can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'group-images'
  AND auth.uid() IN (
    SELECT g.owner_id FROM public.groups g
    WHERE (g.id)::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Group owners can update images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'group-images'
  AND auth.uid() IN (
    SELECT g.owner_id FROM public.groups g
    WHERE (g.id)::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Group owners can delete images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'group-images'
  AND auth.uid() IN (
    SELECT g.owner_id FROM public.groups g
    WHERE (g.id)::text = (storage.foldername(objects.name))[1]
  )
);

-- 5. Remove broad SELECT-all policies from public buckets so anonymous clients
-- can no longer enumerate/list every file. Public buckets still serve files
-- directly via public URL without needing a storage.objects SELECT policy.
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view group images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view word images" ON storage.objects;

-- 6. Lock down trigger / helper functions that never need to be called through the Data API.
REVOKE EXECUTE ON FUNCTION public.generate_join_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_admin_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 7. RLS helper functions: keep executable only for authenticated (needed by RLS
-- policy evaluation); drop anon so unauthenticated clients cannot probe them.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_group_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_group_access(uuid, uuid) TO authenticated, service_role;
