begin;

create or replace function public.is_list_member(p_list_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.list_members lm
    where lm.list_id = p_list_id
      and lm.user_id = p_user_id
  );
$$;

create or replace function public.is_list_owner_or_admin(p_list_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.list_members lm
    where lm.list_id = p_list_id
      and lm.user_id = p_user_id
      and lm.role in ('owner', 'editor')
  );
$$;

commit;
