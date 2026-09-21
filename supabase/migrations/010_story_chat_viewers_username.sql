-- ============================================================================
-- NOMORE: Migration 010 - Story Reaction Chat Events, Story Viewers RLS, Username Change RPC
-- ============================================================================

-- 1. STORY VIEWS: Unique Constraint & Hardened RLS (Story Owner Only Viewer List Access)
create unique index if not exists idx_story_views_unique 
  on public.story_views(story_id, viewer_id);

drop policy if exists "Friends can view story_views" on public.story_views;
drop policy if exists "Members can view story_views" on public.story_views;
drop policy if exists "Story owner can view story_views" on public.story_views;

create policy "Story owner can view story_views"
  on public.story_views for select
  to authenticated
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_views.story_id
      and s.user_id = auth.uid()
    )
  );

-- 2. RPC: Change Username Safely
drop function if exists public.change_username(text) cascade;
create or replace function public.change_username(p_new_username text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_clean text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_new_username is null then
    raise exception 'Username cannot be empty';
  end if;

  v_clean := lower(trim(p_new_username));

  if not (v_clean ~ '^[a-z0-9_]{3,20}$') then
    raise exception 'Username must be 3-20 characters long and contain only lowercase letters, numbers, and underscores';
  end if;

  if exists (
    select 1 from public.profiles
    where lower(username) = v_clean
    and id != v_user_id
  ) then
    raise exception 'Username is already taken';
  end if;

  update public.profiles
  set username = v_clean, updated_at = now()
  where id = v_user_id;

  return true;
end;
$$;

revoke execute on function public.change_username(text) from public;
grant execute on function public.change_username(text) to authenticated;

-- 3. RPC: React to Story and Notify 1-to-1 Chat
drop function if exists public.react_to_story_and_notify_chat(uuid, text) cascade;
create or replace function public.react_to_story_and_notify_chat(
  p_story_id uuid,
  p_emoji text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid;
  v_story record;
  v_conv_id uuid;
  v_existing_msg_id uuid;
  v_content text;
begin
  v_sender_id := auth.uid();
  if v_sender_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Fetch story and verify unexpired & friendship/ownership
  select * into v_story
  from public.stories
  where id = p_story_id and expires_at > now();

  if not found then
    raise exception 'Story not found or expired';
  end if;

  if v_story.user_id != v_sender_id and not public.are_friends(v_sender_id, v_story.user_id) then
    raise exception 'Not authorized to react to this story';
  end if;

  -- 2. Upsert story reaction
  insert into public.story_reactions (story_id, user_id, emoji)
  values (p_story_id, v_sender_id, p_emoji)
  on conflict (story_id, user_id) do update set emoji = excluded.emoji;

  -- 3. If reactor is not the owner, notify 1-to-1 chat
  if v_story.user_id != v_sender_id then
    v_conv_id := public.get_or_create_friend_conversation(v_story.user_id);
    v_content := 'Reacted ' || p_emoji || ' to your story';

    -- Check if a story reaction message for this story already exists from this sender
    select id into v_existing_msg_id
    from public.messages
    where conversation_id = v_conv_id
      and sender_id = v_sender_id
      and message_type = 'system'
      and content like 'Reacted % to your story'
      and created_at > (now() - interval '24 hours')
    order by created_at desc
    limit 1;

    if v_existing_msg_id is not null then
      update public.messages
      set content = v_content, updated_at = now()
      where id = v_existing_msg_id;
    else
      insert into public.messages (conversation_id, sender_id, message_type, content)
      values (v_conv_id, v_sender_id, 'system', v_content);
    end if;
  end if;

  return true;
end;
$$;

revoke execute on function public.react_to_story_and_notify_chat(uuid, text) from public;
grant execute on function public.react_to_story_and_notify_chat(uuid, text) to authenticated;
