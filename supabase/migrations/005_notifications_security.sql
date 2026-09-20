-- ============================================================================
-- NOMORE: Migration 005 - Secure Notifications & RPC
-- ============================================================================

-- 1. Create SECURITY DEFINER function to handle private notification creation securely
create or replace function public.create_private_notification(
  p_type text,
  p_title text,
  p_body text default null,
  p_data jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sender_id uuid;
  v_space_id uuid;
  v_recipient_id uuid;
  v_pref_key text;
  v_pref_enabled boolean;
  v_route text;
begin
  -- Authenticated user check
  v_sender_id := auth.uid();
  if v_sender_id is null then
    return false;
  end if;

  -- Validate notification type
  if p_type not in ('chat', 'story', 'album', 'memory') then
    return false;
  end if;

  -- Map notification type to user settings preference key & default route
  case p_type
    when 'chat' then v_pref_key := 'messages'; v_route := '/chat';
    when 'story' then v_pref_key := 'stories'; v_route := '/stories';
    when 'album' then v_pref_key := 'albums'; v_route := '/albums';
    when 'memory' then v_pref_key := 'memories'; v_route := '/memories';
  end case;

  -- Find private space ID of the sender
  select space_id into v_space_id
  from public.private_space_members
  where auth_user_id = v_sender_id
  limit 1;

  if v_space_id is null then
    return false;
  end if;

  -- Find the partner (recipient) in the same private space
  select auth_user_id into v_recipient_id
  from public.private_space_members
  where space_id = v_space_id and auth_user_id != v_sender_id
  limit 1;

  if v_recipient_id is null then
    return false;
  end if;

  -- Read recipient's notification preference securely
  select (notification_prefs ->> v_pref_key)::boolean into v_pref_enabled
  from public.user_settings
  where user_id = v_recipient_id;

  -- If recipient explicitly turned off notifications for this type, fail closed
  if v_pref_enabled is false then
    return false;
  end if;

  -- Insert notification record securely
  insert into public.notifications (
    recipient_id,
    sender_id,
    type,
    title,
    body,
    data,
    is_read
  ) values (
    v_recipient_id,
    v_sender_id,
    p_type,
    p_title,
    p_body,
    coalesce(p_data, jsonb_build_object('route', v_route)),
    false
  );

  return true;
exception
  when others then
    return false;
end;
$$;

-- Grant execution to authenticated users, revoke from anon/public
revoke execute on function public.create_private_notification(text, text, text, jsonb) from public, anon;
grant execute on function public.create_private_notification(text, text, text, jsonb) to authenticated;

-- 2. Restrict direct client INSERT on notifications table
drop policy if exists "Members can create notifications" on public.notifications;

-- (SELECT, UPDATE, DELETE policies remain intact, ensuring users can only read/update their own notifications)
