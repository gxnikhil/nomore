-- ============================================================================
-- NOMORE: Public Social Platform Migration (007)
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. REMOVE TWO-USER EMAIL RESTRICTIONS
-- ============================================================================

-- Drop old 2-user enforcement trigger on auth.users
drop trigger if exists enforce_email_allowlist_trigger on auth.users;

create or replace function public.enforce_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- All authenticated signups allowed
  return new;
end;
$$;

create or replace function public.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Allow all accounts to be created
  return event;
end;
$$;

-- Update handle_new_user() trigger function for multi-user platform
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_avatar_url text;
begin
  -- Extract display name and avatar from user metadata
  v_display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  v_avatar_url := new.raw_user_meta_data->>'avatar_url';

  -- Create user profile (username remains null until user chooses it on onboarding)
  insert into public.profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    v_display_name,
    v_avatar_url,
    lower(new.email)
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  -- Create default user settings
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ============================================================================
-- 2. USERNAME SYSTEM
-- ============================================================================

-- Add username validation constraint if not exists
alter table public.profiles
  drop constraint if exists check_username_format;

alter table public.profiles
  add constraint check_username_format
  check (username is null or (username ~ '^[a-z0-9_]{3,20}$'));

-- Create case-insensitive unique index on username
create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(username))
  where username is not null;

-- ============================================================================
-- 3. FRIEND REQUESTS & FRIENDSHIPS
-- ============================================================================

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_sender_receiver unique(sender_id, receiver_id),
  constraint no_self_request check (sender_id != receiver_id)
);

create index if not exists idx_friend_requests_receiver on public.friend_requests(receiver_id, status);
create index if not exists idx_friend_requests_sender on public.friend_requests(sender_id, status);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id1 uuid not null references auth.users(id) on delete cascade,
  user_id2 uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint check_canonical_user_ids check (user_id1 < user_id2),
  constraint unique_friendship unique(user_id1, user_id2)
);

create index if not exists idx_friendships_user1 on public.friendships(user_id1);
create index if not exists idx_friendships_user2 on public.friendships(user_id2);

-- Helper function: Check if two users are accepted friends
create or replace function public.are_friends(u1 uuid, u2 uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists(
    select 1 from public.friendships
    where (user_id1 = u1 and user_id2 = u2)
       or (user_id1 = u2 and user_id2 = u1)
  );
$$;

-- Helper function: Get or create 1-on-1 direct conversation for friends
create or replace function public.get_or_create_friend_conversation(p_user2 uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user1 uuid;
  v_conv_id uuid;
begin
  v_user1 := auth.uid();
  if v_user1 is null then
    raise exception 'Not authenticated';
  end if;

  if not public.are_friends(v_user1, p_user2) then
    raise exception 'Users are not friends';
  end if;

  -- Find existing shared conversation
  select cm1.conversation_id into v_conv_id
  from public.conversation_members cm1
  join public.conversation_members cm2 on cm1.conversation_id = cm2.conversation_id
  where cm1.user_id = v_user1 and cm2.user_id = p_user2
  limit 1;

  if v_conv_id is not null then
    return v_conv_id;
  end if;

  -- Create new conversation
  insert into public.conversations default values
  returning id into v_conv_id;

  -- Enroll members
  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_conv_id, v_user1),
    (v_conv_id, p_user2);

  return v_conv_id;
end;
$$;

-- ============================================================================
-- 4. PLAINTEXT CHAT MESSAGES
-- ============================================================================

-- Add plaintext content column to messages
alter table public.messages
  add column if not exists content text;

-- ============================================================================
-- 5. STORY REPLIES
-- ============================================================================

create table if not exists public.story_replies (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_story_replies_story_id on public.story_replies(story_id);

-- ============================================================================
-- 6. REMOVE OBSOLETE FEATURE TABLES (ALBUMS & MEMORIES)
-- ============================================================================

drop table if exists public.album_media cascade;
drop table if exists public.shared_albums cascade;
drop table if exists public.saved_media cascade;

-- ============================================================================
-- 7. RLS POLICIES (STRICT PUBLIC / FRIEND ACCESS CONTROL)
-- ============================================================================

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.story_replies enable row level security;

-- PROFILES: Public read for basic profile info
drop policy if exists "Members can view profiles" on public.profiles;
create policy "Authenticated users can view public profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- FRIEND REQUESTS
create policy "Users can view own friend requests"
  on public.friend_requests for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Users can insert friend requests"
  on public.friend_requests for insert
  to authenticated
  with check (sender_id = auth.uid() and sender_id != receiver_id);

create policy "Involved users can update friend requests"
  on public.friend_requests for update
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Involved users can delete friend requests"
  on public.friend_requests for delete
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- FRIENDSHIPS
create policy "Users can view own friendships"
  on public.friendships for select
  to authenticated
  using (user_id1 = auth.uid() or user_id2 = auth.uid());

create policy "Users can insert friendships"
  on public.friendships for insert
  to authenticated
  with check (user_id1 = auth.uid() or user_id2 = auth.uid());

create policy "Users can delete own friendships"
  on public.friendships for delete
  to authenticated
  using (user_id1 = auth.uid() or user_id2 = auth.uid());

-- STORIES: Friends-only access
drop policy if exists "Members can view stories" on public.stories;
create policy "Friends and author can view stories"
  on public.stories for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.are_friends(user_id, auth.uid())
  );

drop policy if exists "Members can create stories" on public.stories;
create policy "Authenticated users can create stories"
  on public.stories for insert
  to authenticated
  with check (user_id = auth.uid());

-- STORY VIEWS & REACTIONS: Friends only
drop policy if exists "Members can view story_views" on public.story_views;
create policy "Friends can view story_views"
  on public.story_views for select
  to authenticated
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_views.story_id
      and (s.user_id = auth.uid() or public.are_friends(s.user_id, auth.uid()))
    )
  );

drop policy if exists "Members can view story_reactions" on public.story_reactions;
create policy "Friends can view story_reactions"
  on public.story_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_reactions.story_id
      and (s.user_id = auth.uid() or public.are_friends(s.user_id, auth.uid()))
    )
  );

-- STORY REPLIES
create policy "Story author and sender can view story_replies"
  on public.story_replies for select
  to authenticated
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_replies.story_id
      and s.user_id = auth.uid()
    )
  );

create policy "Friends can insert story_replies"
  on public.story_replies for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.stories s
      where s.id = story_replies.story_id
      and (s.user_id = auth.uid() or public.are_friends(s.user_id, auth.uid()))
      and s.expires_at > now()
    )
  );

-- CONVERSATIONS & MESSAGES: Friends + Conversation Members only
drop policy if exists "Conversation members can view messages" on public.messages;
create policy "Conversation members can view messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Conversation members can send messages" on public.messages;
create policy "Conversation members can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
    )
  );
