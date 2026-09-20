-- ============================================================================
-- NOMORE: Storage Buckets & Policies
-- ============================================================================

-- Create private storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('stories', 'stories', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']),
  ('messages', 'messages', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']),
  ('albums', 'albums', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']),
  ('memories', 'memories', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;

-- ============================================================================
-- AVATARS BUCKET POLICIES
-- ============================================================================

create policy "Members can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars' and public.is_nomore_member(auth.uid()));

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- STORIES BUCKET POLICIES
-- ============================================================================

create policy "Members can view stories files"
  on storage.objects for select
  using (bucket_id = 'stories' and public.is_nomore_member(auth.uid()));

create policy "Members can upload stories"
  on storage.objects for insert
  with check (
    bucket_id = 'stories'
    and public.is_nomore_member(auth.uid())
  );

create policy "Users can delete own story files"
  on storage.objects for delete
  using (
    bucket_id = 'stories'
    and public.is_nomore_member(auth.uid())
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ============================================================================
-- MESSAGES BUCKET POLICIES
-- ============================================================================

create policy "Members can view message files"
  on storage.objects for select
  using (bucket_id = 'messages' and public.is_nomore_member(auth.uid()));

create policy "Members can upload message files"
  on storage.objects for insert
  with check (
    bucket_id = 'messages'
    and public.is_nomore_member(auth.uid())
  );

create policy "Users can delete own message files"
  on storage.objects for delete
  using (
    bucket_id = 'messages'
    and public.is_nomore_member(auth.uid())
  );

-- ============================================================================
-- ALBUMS BUCKET POLICIES
-- ============================================================================

create policy "Members can view album files"
  on storage.objects for select
  using (bucket_id = 'albums' and public.is_nomore_member(auth.uid()));

create policy "Members can upload album files"
  on storage.objects for insert
  with check (
    bucket_id = 'albums'
    and public.is_nomore_member(auth.uid())
  );

create policy "Members can delete album files"
  on storage.objects for delete
  using (
    bucket_id = 'albums'
    and public.is_nomore_member(auth.uid())
  );

-- ============================================================================
-- MEMORIES BUCKET POLICIES
-- ============================================================================

create policy "Members can view memory files"
  on storage.objects for select
  using (bucket_id = 'memories' and public.is_nomore_member(auth.uid()));

create policy "Members can upload memory files"
  on storage.objects for insert
  with check (
    bucket_id = 'memories'
    and public.is_nomore_member(auth.uid())
  );

create policy "Members can delete memory files"
  on storage.objects for delete
  using (
    bucket_id = 'memories'
    and public.is_nomore_member(auth.uid())
  );

-- ============================================================================
-- Realtime: Enable realtime for chat-related tables
-- ============================================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.message_read_status;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.stories;
alter publication supabase_realtime add table public.story_reactions;
