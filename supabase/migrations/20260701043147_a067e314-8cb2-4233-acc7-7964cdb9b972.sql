
CREATE OR REPLACE FUNCTION public.find_group_by_join_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id
  FROM public.groups g
  WHERE g.join_code = upper(_code)
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.find_group_by_join_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_group_by_join_code(text) TO authenticated;
