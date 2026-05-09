begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Social domain enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'friend_request_status'
  ) then
    create type public.friend_request_status as enum ('pending', 'accepted', 'declined', 'cancelled');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'list_invitation_status'
  ) then
    create type public.list_invitation_status as enum ('pending', 'accepted', 'declined', 'expired', 'cancelled');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Helper predicates used by RLS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Friend requests (directed)
-- -----------------------------------------------------------------------------
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz null,
  context_list_id uuid null references public.lists(id) on delete set null,
  constraint friend_requests_sender_receiver_different check (sender_id <> receiver_id)
);

create unique index if not exists uq_friend_requests_pending_pair
  on public.friend_requests (sender_id, receiver_id)
  where status = 'pending';

create index if not exists idx_friend_requests_receiver_status
  on public.friend_requests (receiver_id, status, created_at desc);

create index if not exists idx_friend_requests_sender_status
  on public.friend_requests (sender_id, status, created_at desc);

-- -----------------------------------------------------------------------------
-- Friendships (undirected canonical pair)
-- -----------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.users(id) on delete cascade,
  user_high_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  source_request_id uuid null references public.friend_requests(id) on delete set null,
  constraint friendships_pair_order check (user_low_id < user_high_id)
);

create unique index if not exists uq_friendships_pair
  on public.friendships (user_low_id, user_high_id);

create index if not exists idx_friendships_user_low
  on public.friendships (user_low_id, created_at desc);

create index if not exists idx_friendships_user_high
  on public.friendships (user_high_id, created_at desc);

-- -----------------------------------------------------------------------------
-- List invitations (friend or email)
-- -----------------------------------------------------------------------------
create table if not exists public.list_invitations (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  inviter_id uuid not null references public.users(id) on delete cascade,
  invitee_user_id uuid null references public.users(id) on delete set null,
  invitee_email text null,
  status public.list_invitation_status not null default 'pending',
  token uuid not null default gen_random_uuid(),
  role_to_grant text not null default 'member',
  message text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz null,
  constraint list_invitations_target_oneof check (
    (invitee_user_id is not null and invitee_email is null)
    or (invitee_user_id is null and invitee_email is not null)
  ),
  constraint list_invitations_not_self check (inviter_id <> coalesce(invitee_user_id, inviter_id)),
  constraint list_invitations_valid_role check (role_to_grant in ('editor')),
  constraint list_invitations_email_format check (
    invitee_email is null
    or invitee_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  )
);

create unique index if not exists uq_list_invitations_pending_user
  on public.list_invitations (list_id, invitee_user_id)
  where status = 'pending' and invitee_user_id is not null;

create unique index if not exists uq_list_invitations_pending_email
  on public.list_invitations (list_id, lower(invitee_email))
  where status = 'pending' and invitee_email is not null;

create unique index if not exists uq_list_invitations_token
  on public.list_invitations (token);

create index if not exists idx_list_invitations_list_status
  on public.list_invitations (list_id, status, created_at desc);

create index if not exists idx_list_invitations_invitee_user
  on public.list_invitations (invitee_user_id, status, created_at desc)
  where invitee_user_id is not null;

create index if not exists idx_list_invitations_invitee_email
  on public.list_invitations (lower(invitee_email), status, created_at desc)
  where invitee_email is not null;

-- Helpful lookup index for the invitation edge function.
create index if not exists idx_users_email_lower on public.users (lower(email));

-- -----------------------------------------------------------------------------
-- RLS enablement
-- -----------------------------------------------------------------------------
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.list_invitations enable row level security;

-- -----------------------------------------------------------------------------
-- RLS policies: friend_requests
-- -----------------------------------------------------------------------------
drop policy if exists friend_requests_select_participants on public.friend_requests;
create policy friend_requests_select_participants
on public.friend_requests
for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists friend_requests_insert_sender_only on public.friend_requests;
create policy friend_requests_insert_sender_only
on public.friend_requests
for insert
with check (
  auth.uid() = sender_id
  and auth.uid() <> receiver_id
  and status = 'pending'
);

drop policy if exists friend_requests_update_participants on public.friend_requests;
create policy friend_requests_update_participants
on public.friend_requests
for update
using (auth.uid() = sender_id or auth.uid() = receiver_id)
with check (
  auth.uid() = sender_id or auth.uid() = receiver_id
);

-- -----------------------------------------------------------------------------
-- RLS policies: friendships
-- -----------------------------------------------------------------------------
drop policy if exists friendships_select_participants on public.friendships;
create policy friendships_select_participants
on public.friendships
for select
using (auth.uid() = user_low_id or auth.uid() = user_high_id);

drop policy if exists friendships_insert_block_client on public.friendships;
create policy friendships_insert_block_client
on public.friendships
for insert
with check (false);

drop policy if exists friendships_update_block_client on public.friendships;
create policy friendships_update_block_client
on public.friendships
for update
using (false)
with check (false);

drop policy if exists friendships_delete_participants on public.friendships;
create policy friendships_delete_participants
on public.friendships
for delete
using (auth.uid() = user_low_id or auth.uid() = user_high_id);

-- -----------------------------------------------------------------------------
-- RLS policies: list_invitations
-- -----------------------------------------------------------------------------
drop policy if exists list_invitations_select_scope on public.list_invitations;
create policy list_invitations_select_scope
on public.list_invitations
for select
using (
  auth.uid() = inviter_id
  or auth.uid() = invitee_user_id
  or public.is_list_member(list_id, auth.uid())
);

drop policy if exists list_invitations_insert_inviter on public.list_invitations;
create policy list_invitations_insert_inviter
on public.list_invitations
for insert
with check (
  auth.uid() = inviter_id
  and public.is_list_owner_or_admin(list_id, auth.uid())
  and status = 'pending'
  and expires_at > now()
);

drop policy if exists list_invitations_update_inviter_or_invitee on public.list_invitations;
create policy list_invitations_update_inviter_or_invitee
on public.list_invitations
for update
using (
  auth.uid() = inviter_id
  or auth.uid() = invitee_user_id
)
with check (
  auth.uid() = inviter_id
  or auth.uid() = invitee_user_id
);

drop policy if exists list_invitations_delete_inviter_or_owner on public.list_invitations;
create policy list_invitations_delete_inviter_or_owner
on public.list_invitations
for delete
using (
  auth.uid() = inviter_id
  or public.is_list_owner_or_admin(list_id, auth.uid())
);

commit;
