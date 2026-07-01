
REVOKE ALL ON public.otp_codes FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.otp_codes TO service_role;
