-- Set replica identity for group messages and group vocabularies
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.group_vocabularies REPLICA IDENTITY FULL;