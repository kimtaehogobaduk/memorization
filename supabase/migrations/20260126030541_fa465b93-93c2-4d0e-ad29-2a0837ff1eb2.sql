-- Add tutorial completion tracking to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS has_completed_tutorial boolean DEFAULT false;