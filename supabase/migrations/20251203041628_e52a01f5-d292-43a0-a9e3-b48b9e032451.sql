-- Add ai_auto_meaning setting to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS ai_auto_meaning boolean DEFAULT false;