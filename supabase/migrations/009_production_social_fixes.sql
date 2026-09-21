-- ============================================================================
-- NOMORE: Migration 009 - Production Social Fixes
-- Reconciles legacy space_id NOT NULL constraints for Stories & Conversations
-- ============================================================================

-- 1. Make legacy space_id column nullable in public.stories and public.conversations
alter table public.stories alter column space_id drop not null;
alter table public.conversations alter column space_id drop not null;

-- 2. Ensure RLS policies on stories permit public-social story creation and reading
drop policy if exists "Friends and author can view stories" on public.stories;
create policy "Friends and author can view stories"
  on public.stories for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.are_friends(user_id, auth.uid())
  );

drop policy if exists "Authenticated users can create stories" on public.stories;
create policy "Authenticated users can create stories"
  on public.stories for insert
  to authenticated
  with check (user_id = auth.uid());
