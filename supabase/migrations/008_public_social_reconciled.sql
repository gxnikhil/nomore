-- ============================================================================
-- NOMORE: Reconciled & Hardened Public Social Platform Migration (008)
-- Designed specifically for live database state (preserves existing profiles & legacy tables)
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. AUTH & PROFILE PROVISIONING (REMOVE 2-USER RESTRICTIONS)
-- ============================================================================

-- Drop obsolete 2-user enforcement triggers/hooks
drop trigger if exists enforce_email_allowlist_trigger on auth.users;
drop function if exists public.enforce_email_allowlist() cascade;
drop function if exists public.before_user_created_hook(jsonb) cascade;

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
  v_display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  v_avatar_url := new.raw_user_meta_data->>'avatar_url';

  -- Create user profile (username remains null until user chooses it on onboarding)
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    v_display_name,
    v_avatar_url
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

-- Drop legacy email column from public.profiles to enforce email privacy (auth.users stores email)
alter table public.profiles drop column if exists email;

-- ============================================================================
-- 2. USERNAME CONSTRAINTS & INDEXES
-- ============================================================================

-- Ensure check_username_format constraint allows null or valid handles
alter table public.profiles
  drop constraint if exists check_username_format;

alter table public.profiles
  add constraint check_username_format
  check (username is null or (username ~ '^[a-z0-9_]{3,20}$'));

-- Create case-insensitive unique index on non-null usernames
create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(username))
  where username is not null;

-- ============================================================================
-- 3. FRIEND REQUESTS & FRIENDSHIPS TABLES
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

create unique index if not exists idx_friend_requests_unique_pending 
  on public.friend_requests (sender_id, receiver_id) 
  where status = 'pending';

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

-- ============================================================================
-- 4. HARDENED SOCIAL RPC FUNCTIONS & EXECUTE GRANTS
-- ============================================================================

-- Helper: Check if two users are accepted friends
drop function if exists public.are_friends(uuid, uuid) cascade;
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

revoke execute on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- Helper: Check if username is available
drop function if exists public.check_username_available(text) cascade;
create or replace function public.check_username_available(p_username text)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if p_username is null or not (p_username ~ '^[a-z0-9_]{3,20}$') then
    return false;
  end if;

  return not exists (
    select 1 from public.profiles
    where lower(username) = lower(p_username)
  );
end;
$$;

revoke execute on function public.check_username_available(text) from public;
grant execute on function public.check_username_available(text) to authenticated;

-- Helper: Accept a friend request safely (Enforces receiver identity)
drop function if exists public.accept_friend_request(uuid) cascade;
create or replace function public.accept_friend_request(request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req record;
  v_u1 uuid;
  v_u2 uuid;
begin
  select * into v_req
  from public.friend_requests
  where id = request_id and receiver_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Friend request not found or unauthorized';
  end if;

  v_u1 := least(v_req.sender_id, v_req.receiver_id);
  v_u2 := greatest(v_req.sender_id, v_req.receiver_id);

  update public.friend_requests
  set status = 'accepted', updated_at = now()
  where id = request_id;

  insert into public.friendships (user_id1, user_id2)
  values (v_u1, v_u2)
  on conflict (user_id1, user_id2) do nothing;

  return true;
end;
$$;

revoke execute on function public.accept_friend_request(uuid) from public;
grant execute on function public.accept_friend_request(uuid) to authenticated;

-- Helper: Reject a friend request safely (Enforces receiver identity)
drop function if exists public.reject_friend_request(uuid) cascade;
create or replace function public.reject_friend_request(request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.friend_requests
  set status = 'rejected', updated_at = now()
  where id = request_id and receiver_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Friend request not found or unauthorized';
  end if;

  return true;
end;
$$;

revoke execute on function public.reject_friend_request(uuid) from public;
grant execute on function public.reject_friend_request(uuid) to authenticated;

-- Helper: Cancel a pending friend request (Enforces sender identity)
drop function if exists public.cancel_friend_request(request_id uuid) cascade;
create or replace function public.cancel_friend_request(request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.friend_requests
  set status = 'cancelled', updated_at = now()
  where id = request_id and sender_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Friend request not found or unauthorized';
  end if;

  return true;
end;
$$;

revoke execute on function public.cancel_friend_request(uuid) from public;
grant execute on function public.cancel_friend_request(uuid) to authenticated;

-- Helper: Remove friend safely
drop function if exists public.remove_friend(uuid) cascade;
create or replace function public.remove_friend(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_u1 uuid;
  v_u2 uuid;
begin
  v_u1 := least(auth.uid(), target_user_id);
  v_u2 := greatest(auth.uid(), target_user_id);

  delete from public.friendships
  where user_id1 = v_u1 and user_id2 = v_u2;

  return true;
end;
$$;

revoke execute on function public.remove_friend(uuid) from public;
grant execute on function public.remove_friend(uuid) to authenticated;

-- Helper: Get or create 1-on-1 direct conversation for friends (Advisory Lock + Strict 2-Member Match)
drop function if exists public.get_or_create_friend_conversation(uuid) cascade;
create or replace function public.get_or_create_friend_conversation(p_user2 uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user1 uuid;
  v_u1 uuid;
  v_u2 uuid;
  v_conv_id uuid;
  v_lock_id bigint;
begin
  v_user1 := auth.uid();
  if v_user1 is null then
    raise exception 'Not authenticated';
  end if;

  if not public.are_friends(v_user1, p_user2) then
    raise exception 'Users are not friends';
  end if;

  v_u1 := least(v_user1, p_user2);
  v_u2 := greatest(v_user1, p_user2);
  v_lock_id := hashtext(v_u1::text || ':' || v_u2::text);

  -- Transaction-level advisory lock for this exact user pair
  perform pg_advisory_xact_lock(v_lock_id);

  -- 1. Check existing shared 1-on-1 conversation (strictly 2 members)
  select cm1.conversation_id into v_conv_id
  from public.conversation_members cm1
  join public.conversation_members cm2 on cm1.conversation_id = cm2.conversation_id
  where cm1.user_id = v_user1 and cm2.user_id = p_user2
    and (
      select count(*)
      from public.conversation_members cm3
      where cm3.conversation_id = cm1.conversation_id
    ) = 2
  limit 1;

  if v_conv_id is not null then
    return v_conv_id;
  end if;

  -- 2. Create new conversation row
  insert into public.conversations default values
  returning id into v_conv_id;

  -- 3. Enroll both members
  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_conv_id, v_user1),
    (v_conv_id, p_user2)
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;

revoke execute on function public.get_or_create_friend_conversation(uuid) from public;
grant execute on function public.get_or_create_friend_conversation(uuid) to authenticated;

-- ============================================================================
-- 5. PLAINTEXT CHAT MESSAGES & STORY REPLIES
-- ============================================================================

-- Add plaintext content column to messages (preserves ciphertext column intact)
alter table public.messages
  add column if not exists content text;

-- Create story replies table
create table if not exists public.story_replies (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_story_replies_story_id on public.story_replies(story_id);

-- ============================================================================
-- 6. RLS HELPER FUNCTIONS (PREVENT RLS RECURSION)
-- ============================================================================

-- Security Definer helper to check conversation membership without RLS recursion
drop function if exists public.is_conversation_member(uuid, uuid) cascade;
create or replace function public.is_conversation_member(p_user_id uuid, p_conv_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists(
    select 1 from public.conversation_members
    where user_id = p_user_id and conversation_id = p_conv_id
  );
$$;

revoke execute on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

-- ============================================================================
-- 7. HARDENED ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.story_reactions enable row level security;
alter table public.story_replies enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_media enable row level security;
alter table public.notifications enable row level security;

-- PROFILES
drop policy if exists "Members can view profiles" on public.profiles;
drop policy if exists "Authenticated users can view public profiles" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Authenticated users can view public profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- USER SETTINGS
drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings"
  on public.user_settings for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
  on public.user_settings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
  on public.user_settings for insert
  to authenticated
  with check (user_id = auth.uid());

-- FRIEND REQUESTS (HARDENED - Direct UPDATE & DELETE Removed, Managed via RPCs)
drop policy if exists "Users can view own friend requests" on public.friend_requests;
create policy "Users can view own friend requests"
  on public.friend_requests for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can insert friend requests" on public.friend_requests;
create policy "Users can insert friend requests"
  on public.friend_requests for insert
  to authenticated
  with check (sender_id = auth.uid() and sender_id != receiver_id and status = 'pending');

drop policy if exists "Involved users can update friend requests" on public.friend_requests;
drop policy if exists "Involved users can delete friend requests" on public.friend_requests;

-- FRIENDSHIPS (HARDENED - Direct INSERT/DELETE Removed, Managed strictly via RPCs)
drop policy if exists "Users can view own friendships" on public.friendships;
create policy "Users can view own friendships"
  on public.friendships for select
  to authenticated
  using (user_id1 = auth.uid() or user_id2 = auth.uid());

drop policy if exists "Users can insert friendships" on public.friendships;
drop policy if exists "Users can delete own friendships" on public.friendships;

-- STORIES
drop policy if exists "Members can view stories" on public.stories;
drop policy if exists "Friends and author can view stories" on public.stories;
create policy "Friends and author can view stories"
  on public.stories for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.are_friends(user_id, auth.uid())
  );

drop policy if exists "Members can create stories" on public.stories;
drop policy if exists "Authenticated users can create stories" on public.stories;
create policy "Authenticated users can create stories"
  on public.stories for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Authors can delete own stories" on public.stories;
create policy "Authors can delete own stories"
  on public.stories for delete
  to authenticated
  using (user_id = auth.uid());

-- STORY VIEWS & REACTIONS
drop policy if exists "Members can view story_views" on public.story_views;
drop policy if exists "Friends can view story_views" on public.story_views;
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

drop policy if exists "Members can insert story_views" on public.story_views;
drop policy if exists "Authenticated users can insert story_views" on public.story_views;
create policy "Authenticated users can insert story_views"
  on public.story_views for insert
  to authenticated
  with check (
    viewer_id = auth.uid()
    and exists (
      select 1 from public.stories s
      where s.id = story_views.story_id
      and (s.user_id = auth.uid() or public.are_friends(s.user_id, auth.uid()))
      and s.expires_at > now()
    )
  );

drop policy if exists "Members can view story_reactions" on public.story_reactions;
drop policy if exists "Friends can view story_reactions" on public.story_reactions;
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

drop policy if exists "Members can insert story_reactions" on public.story_reactions;
drop policy if exists "Authenticated users can insert story_reactions" on public.story_reactions;
create policy "Authenticated users can insert story_reactions"
  on public.story_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.stories s
      where s.id = story_reactions.story_id
      and (s.user_id = auth.uid() or public.are_friends(s.user_id, auth.uid()))
      and s.expires_at > now()
    )
  );

drop policy if exists "Users can delete own story_reactions" on public.story_reactions;
create policy "Users can delete own story_reactions"
  on public.story_reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- STORY REPLIES
drop policy if exists "Story author and sender can view story_replies" on public.story_replies;
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

drop policy if exists "Friends can insert story_replies" on public.story_replies;
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

-- CONVERSATIONS & CONVERSATION MEMBERS (HARDENED - Direct INSERT Removed, Managed via RPC)
drop policy if exists "Members can view conversations" on public.conversations;
drop policy if exists "Conversation members can view conversations" on public.conversations;
create policy "Conversation members can view conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_member(auth.uid(), id));

drop policy if exists "Members can create conversations" on public.conversations;
drop policy if exists "Authenticated users can create conversations" on public.conversations;

drop policy if exists "Members can view conversation_members" on public.conversation_members;
drop policy if exists "Conversation members can view conversation_members" on public.conversation_members;
create policy "Conversation members can view conversation_members"
  on public.conversation_members for select
  to authenticated
  using (user_id = auth.uid() or public.is_conversation_member(auth.uid(), conversation_id));

drop policy if exists "Members can create conversation_members" on public.conversation_members;
drop policy if exists "Authenticated users can create conversation_members" on public.conversation_members;

-- MESSAGES & MESSAGE MEDIA
drop policy if exists "Members can view messages" on public.messages;
drop policy if exists "Conversation members can view messages" on public.messages;
create policy "Conversation members can view messages"
  on public.messages for select
  to authenticated
  using (public.is_conversation_member(auth.uid(), conversation_id));

drop policy if exists "Members can send messages" on public.messages;
drop policy if exists "Members can insert messages" on public.messages;
drop policy if exists "Conversation members can send messages" on public.messages;
create policy "Conversation members can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(auth.uid(), conversation_id)
  );

drop policy if exists "Members can view message_media" on public.message_media;
drop policy if exists "Conversation members can view message_media" on public.message_media;
create policy "Conversation members can view message_media"
  on public.message_media for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_media.message_id
      and public.is_conversation_member(auth.uid(), m.conversation_id)
    )
  );

drop policy if exists "Members can insert message_media" on public.message_media;
drop policy if exists "Conversation members can insert message_media" on public.message_media;
create policy "Conversation members can insert message_media"
  on public.message_media for insert
  to authenticated
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_media.message_id
      and m.sender_id = auth.uid()
      and public.is_conversation_member(auth.uid(), m.conversation_id)
    )
  );

-- NOTIFICATIONS (Matches Live Table Schema Column: recipient_id)
drop policy if exists "Members can view notifications" on public.notifications;
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "System and users can insert notifications" on public.notifications;
drop policy if exists "Authenticated users can insert notifications" on public.notifications;
create policy "Authenticated users can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

-- ============================================================================
-- 8. HARDENED STORAGE BUCKET POLICIES (EXACT FRONTEND PATH & EXPIRATION MATCH)
-- ============================================================================

-- Avatars Bucket
drop policy if exists "Members can view avatars" on storage.objects;
drop policy if exists "Authenticated users can view avatars" on storage.objects;
create policy "Authenticated users can view avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "Members can upload avatars" on storage.objects;
drop policy if exists "Users can upload avatars" on storage.objects;
create policy "Users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Stories Bucket (Frontend Path: `{user_id}/{filename}` - Enforces Author / Unexpired Friend Access)
drop policy if exists "Members can view stories files" on storage.objects;
drop policy if exists "Friends and author can view story files" on storage.objects;
create policy "Friends and author can view story files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'stories'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.stories s
        where s.user_id::text = (storage.foldername(name))[1]
        and public.are_friends(s.user_id, auth.uid())
        and s.expires_at > now()
      )
    )
  );

drop policy if exists "Members can upload stories" on storage.objects;
drop policy if exists "Users can upload stories" on storage.objects;
create policy "Users can upload stories"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own story files" on storage.objects;
create policy "Users can update own story files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own story files" on storage.objects;
create policy "Users can delete own story files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Messages Bucket (Frontend Path: `{conversation_id}/{filename}`)
drop policy if exists "Members can view message files" on storage.objects;
drop policy if exists "Conversation members can view message files" on storage.objects;
create policy "Conversation members can view message files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'messages'
    and public.is_conversation_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

drop policy if exists "Members can upload message files" on storage.objects;
drop policy if exists "Users can upload message files" on storage.objects;
create policy "Users can upload message files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'messages'
    and public.is_conversation_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

drop policy if exists "Users can update message files" on storage.objects;
create policy "Users can update message files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'messages'
    and public.is_conversation_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

drop policy if exists "Users can delete message files" on storage.objects;
create policy "Users can delete message files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'messages'
    and public.is_conversation_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

-- Legacy Buckets (Preserves existing album & memory assets)
drop policy if exists "Members can view album files" on storage.objects;
drop policy if exists "Authenticated users can view album files" on storage.objects;
create policy "Authenticated users can view album files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'albums');

drop policy if exists "Members can view memory files" on storage.objects;
drop policy if exists "Authenticated users can view memory files" on storage.objects;
create policy "Authenticated users can view memory files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'memories');
