ALTER TABLE public.vocabularies ALTER COLUMN share_code SET DEFAULT '';
REVOKE EXECUTE ON FUNCTION public.generate_share_code(text) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.set_vocabulary_share_code() FROM authenticated, anon, public;