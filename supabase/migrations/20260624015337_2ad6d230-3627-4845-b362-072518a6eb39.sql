ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS new_device_email_notify boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_device_verify_enabled boolean NOT NULL DEFAULT true;