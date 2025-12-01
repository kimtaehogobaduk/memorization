-- Create helper function to check group access without causing RLS recursion
create or replace function public.has_group_access(_user_id uuid, _group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.user_id = _user_id
      and gm.group_id = _group_id
  );
$$;

-- Replace SELECT policy on groups to avoid referencing group_members directly
drop policy if exists "Users can view accessible groups" on public.groups;

create policy "Users can view accessible groups"
on public.groups
for select
using (
  is_public = true
  or owner_id = auth.uid()
  or public.has_group_access(auth.uid(), id)
);