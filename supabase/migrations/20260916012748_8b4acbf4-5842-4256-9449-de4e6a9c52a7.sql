CREATE OR REPLACE FUNCTION public.generate_share_code(p_name text)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  base text;
  code text;
BEGIN
  base := lower(regexp_replace(coalesce(p_name,''), '[^a-z0-9가-힣]+', '-', 'g'));
  base := trim(both '-' from base);
  IF base = '' THEN base := 'vocab'; END IF;
  base := left(base, 30);
  LOOP
    code := base || '-' || substr(md5(random()::text), 1, 4);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vocabularies WHERE share_code = code);
  END LOOP;
  RETURN code;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_share_code(text) FROM authenticated, anon, public;