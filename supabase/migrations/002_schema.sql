-- ============================================================================
-- NOMORE: Database Schema
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Private space (exactly one)
create table if not exists public.private_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'NOMORE',
  created_at timestamptz not null default now()
);

-- Space members (exactly two)
create table if not exists public.private_space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.private_spaces(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  unique(space_id, auth_user_id)
);

-- User profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  bio text,
  email text,
  birthday date,
  relationship_info text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- STORIES
-- ============================================================================

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references public.private_spaces(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text not null,
  caption text,
  duration_seconds integer, -- for video stories
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create index if not exists idx_stories_user_id on public.stories(user_id);
create index if not exists idx_stories_expires_at on public.stories(expires_at);
create index if not exists idx_stories_space_id on public.stories(space_id);

create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(story_id, viewer_id)
);

create table if not exists public.story_reactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique(story_id, user_id)
);

-- ============================================================================
-- CHAT
-- ============================================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.private_spaces(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  encrypted_content text, -- E2EE encrypted message content (base64)
  iv text, -- Initialization vector for AES-GCM (base64)
  message_type text not null default 'text' check (message_type in ('text', 'media', 'system', 'reply')),
  reply_to_id uuid references public.messages(id) on delete set null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation_id on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender_id on public.messages(sender_id);

create table if not exists public.message_media (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text,
  file_name text,
  file_size bigint,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_message_media_message_id on public.message_media(message_id);

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique(message_id, user_id, emoji)
);

create table if not exists public.message_read_status (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique(message_id, user_id)
);

-- ============================================================================
-- ALBUMS & MEMORIES
-- ============================================================================

create table if not exists public.shared_albums (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.private_spaces(id) on delete cascade,
  title text not null,
  description text,
  cover_storage_path text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shared_albums_space_id on public.shared_albums(space_id);

create table if not exists public.album_media (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.shared_albums(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text,
  caption text,
  file_name text,
  file_size bigint,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_album_media_album_id on public.album_media(album_id);

create table if not exists public.saved_media (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.private_spaces(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text,
  caption text,
  file_name text,
  file_size bigint,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  memory_date date,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_saved_media_space_id on public.saved_media(space_id);
create index if not exists idx_saved_media_memory_date on public.saved_media(memory_date);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  data jsonb default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient on public.notifications(recipient_id, is_read, created_at desc);

-- ============================================================================
-- SETTINGS & ENCRYPTION
-- ============================================================================

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  notification_prefs jsonb not null default '{"messages": true, "stories": true, "albums": true, "memories": true}',
  updated_at timestamptz not null default now()
);

create table if not exists public.encryption_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_key_jwk jsonb not null, -- ECDH P-256 public key in JWK format
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- AUTO-ENROLLMENT TRIGGER
-- ============================================================================

-- Attach the handle_new_user trigger (function defined in 001_auth_hook.sql)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- HELPER FUNCTION: updated_at auto-update
-- ============================================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at triggers
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger messages_updated_at before update on public.messages
  for each row execute function public.update_updated_at();

create trigger shared_albums_updated_at before update on public.shared_albums
  for each row execute function public.update_updated_at();

create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.update_updated_at();

create trigger encryption_keys_updated_at before update on public.encryption_keys
  for each row execute function public.update_updated_at();
