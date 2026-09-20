-- ============================================================================
-- NOMORE: Row Level Security Policies
-- ============================================================================

-- Helper function: Check if a user is a member of the NOMORE space
create or replace function public.is_nomore_member(user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists(
    select 1 from public.private_space_members
    where auth_user_id = user_id
  );
$$;

-- Helper function: Check if a user is a member of a specific conversation
create or replace function public.is_conversation_member(user_id uuid, conv_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists(
    select 1 from public.conversation_members
    where user_id = user_id and conversation_id = conv_id
  );
$$;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

alter table public.private_spaces enable row level security;
alter table public.private_space_members enable row level security;
alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.story_reactions enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_media enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_read_status enable row level security;
alter table public.shared_albums enable row level security;
alter table public.album_media enable row level security;
alter table public.saved_media enable row level security;
alter table public.notifications enable row level security;
alter table public.user_settings enable row level security;
alter table public.encryption_keys enable row level security;

-- ============================================================================
-- PRIVATE SPACES
-- ============================================================================

create policy "Members can view spaces"
  on public.private_spaces for select
  using (public.is_nomore_member(auth.uid()));

-- ============================================================================
-- PRIVATE SPACE MEMBERS
-- ============================================================================

create policy "Members can view members"
  on public.private_space_members for select
  using (public.is_nomore_member(auth.uid()));

-- ============================================================================
-- PROFILES
-- ============================================================================

create policy "Members can view profiles"
  on public.profiles for select
  using (public.is_nomore_member(auth.uid()));

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================================
-- STORIES
-- ============================================================================

create policy "Members can view stories"
  on public.stories for select
  using (public.is_nomore_member(auth.uid()));

create policy "Members can create stories"
  on public.stories for insert
  with check (
    user_id = auth.uid()
    and public.is_nomore_member(auth.uid())
  );

create policy "Users can delete own stories"
  on public.stories for delete
  using (user_id = auth.uid());

-- ============================================================================
-- STORY VIEWS
-- ============================================================================

create policy "Members can view story_views"
  on public.story_views for select
  using (public.is_nomore_member(auth.uid()));

create policy "Members can insert story_views"
  on public.story_views for insert
  with check (
    viewer_id = auth.uid()
    and public.is_nomore_member(auth.uid())
  );

-- ============================================================================
-- STORY REACTIONS
-- ============================================================================

create policy "Members can view story_reactions"
  on public.story_reactions for select
  using (public.is_nomore_member(auth.uid()));

create policy "Members can insert story_reactions"
  on public.story_reactions for insert
  with check (
    user_id = auth.uid()
    and public.is_nomore_member(auth.uid())
  );

create policy "Users can delete own story_reactions"
  on public.story_reactions for delete
  using (user_id = auth.uid());

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================

create policy "Members can view conversations"
  on public.conversations for select
  using (public.is_nomore_member(auth.uid()));

create policy "Members can create conversations"
  on public.conversations for insert
  with check (public.is_nomore_member(auth.uid()));

-- ============================================================================
-- CONVERSATION MEMBERS
-- ============================================================================

create policy "Members can view conversation_members"
  on public.conversation_members for select
  using (public.is_nomore_member(auth.uid()));

create policy "Members can create conversation_members"
  on public.conversation_members for insert
  with check (public.is_nomore_member(auth.uid()));

-- ============================================================================
-- MESSAGES
-- ============================================================================

create policy "Conversation members can view messages"
  on public.messages for select
  using (
    public.is_nomore_member(auth.uid())
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
    )
  );

create policy "Conversation members can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
    )
  );

create policy "Users can update own messages"
  on public.messages for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

create policy "Users can delete own messages"
  on public.messages for delete
  using (sender_id = auth.uid());

-- ============================================================================
-- MESSAGE MEDIA
-- ============================================================================

create policy "Conversation members can view message_media"
  on public.message_media for select
  using (
    public.is_nomore_member(auth.uid())
    and exists (
      select 1 from public.messages m
      join public.conversation_members cm on cm.conversation_id = m.conversation_id
      where m.id = message_media.message_id
      and cm.user_id = auth.uid()
    )
  );

create policy "Members can insert message_media"
  on public.message_media for insert
  with check (
    public.is_nomore_member(auth.uid())
    and exists (
      select 1 from public.messages m
      where m.id = message_media.message_id
      and m.sender_id = auth.uid()
    )
  );

create policy "Users can delete own message_media"
  on public.message_media for delete
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_media.message_id
      and m.sender_id = auth.uid()
    )
  );

-- ============================================================================
-- MESSAGE REACTIONS
-- ============================================================================

create policy "Conversation members can view message_reactions"
  on public.message_reactions for select
  using (public.is_nomore_member(auth.uid()));

create policy "Members can insert message_reactions"
  on public.message_reactions for insert
  with check (
    user_id = auth.uid()
    and public.is_nomore_member(auth.uid())
  );

create policy "Users can delete own message_reactions"
  on public.message_reactions for delete
  using (user_id = auth.uid());

-- ============================================================================
-- MESSAGE READ STATUS
-- ============================================================================

create policy "Members can view read_status"
  on public.message_read_status for select
  using (public.is_nomore_member(auth.uid()));

create policy "Members can insert read_status"
  on public.message_read_status for insert
  with check (
    user_id = auth.uid()
    and public.is_nomore_member(auth.uid())
  );

-- ============================================================================
-- SHARED ALBUMS
-- ============================================================================

create policy "Members can view albums"
  on public.shared_albums for select
  using (public.is_nomore_member(auth.uid()));

create policy "Members can create albums"
  on public.shared_albums for insert
  with check (
    created_by = auth.uid()
    and public.is_nomore_member(auth.uid())
  );

create policy "Members can update albums"
  on public.shared_albums for update
  using (public.is_nomore_member(auth.uid()));

create policy "Creator can delete albums"
  on public.shared_albums for delete
  using (created_by = auth.uid());

-- ============================================================================
-- ALBUM MEDIA
-- ============================================================================

create policy "Members can view album_media"
  on public.album_media for select
  using (public.is_nomore_member(auth.uid()));

create policy "Members can insert album_media"
  on public.album_media for insert
  with check (
    uploaded_by = auth.uid()
    and public.is_nomore_member(auth.uid())
  );

create policy "Uploader can delete album_media"
  on public.album_media for delete
  using (uploaded_by = auth.uid());

-- ============================================================================
-- SAVED MEDIA (MEMORIES)
-- ============================================================================

create policy "Members can view saved_media"
  on public.saved_media for select
  using (public.is_nomore_member(auth.uid()));

create policy "Members can insert saved_media"
  on public.saved_media for insert
  with check (
    uploaded_by = auth.uid()
    and public.is_nomore_member(auth.uid())
  );

create policy "Members can update saved_media"
  on public.saved_media for update
  using (public.is_nomore_member(auth.uid()));

create policy "Uploader can delete saved_media"
  on public.saved_media for delete
  using (uploaded_by = auth.uid());

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

create policy "Users can view own notifications"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "Members can create notifications"
  on public.notifications for insert
  with check (public.is_nomore_member(auth.uid()));

create policy "Users can update own notifications"
  on public.notifications for update
  using (recipient_id = auth.uid());

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (recipient_id = auth.uid());

-- ============================================================================
-- USER SETTINGS
-- ============================================================================

create policy "Users can view own settings"
  on public.user_settings for select
  using (user_id = auth.uid());

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (user_id = auth.uid());

create policy "Users can update own settings"
  on public.user_settings for update
  using (user_id = auth.uid());

-- ============================================================================
-- ENCRYPTION KEYS
-- ============================================================================

create policy "Members can view encryption_keys"
  on public.encryption_keys for select
  using (public.is_nomore_member(auth.uid()));

create policy "Users can insert own encryption_keys"
  on public.encryption_keys for insert
  with check (user_id = auth.uid());

create policy "Users can update own encryption_keys"
  on public.encryption_keys for update
  using (user_id = auth.uid());
