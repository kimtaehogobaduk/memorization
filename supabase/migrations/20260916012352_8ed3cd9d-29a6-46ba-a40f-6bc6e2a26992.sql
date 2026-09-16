ALTER TABLE public.vocabularies ADD COLUMN IF NOT EXISTS share_code text;

CREATE OR REPLACE FUNCTION public.generate_share_code(p_name text)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  base text;
  code text;
BEGIN
  base := lower(regexp_replace(coalesce(p_name,''), '[^a-z0-9]+', '-', 'g'));
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

UPDATE public.vocabularies SET share_code = public.generate_share_code(name) WHERE share_code IS NULL;

ALTER TABLE public.vocabularies ALTER COLUMN share_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vocabularies_share_code_idx ON public.vocabularies (share_code);

CREATE OR REPLACE FUNCTION public.set_vocabulary_share_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.share_code IS NULL OR NEW.share_code = '' THEN
    NEW.share_code := public.generate_share_code(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vocabulary_share_code ON public.vocabularies;
CREATE TRIGGER trg_vocabulary_share_code BEFORE INSERT ON public.vocabularies FOR EACH ROW EXECUTE FUNCTION public.set_vocabulary_share_code();