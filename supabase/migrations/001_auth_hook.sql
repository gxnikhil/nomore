-- ============================================================================
-- NOMORE: Auth Hook — Restrict signups to exactly two authorized emails
-- ============================================================================
-- IMPORTANT: After running this migration, you MUST enable the Auth Hook
-- in Supabase Dashboard → Authentication → Hooks → Before User Created
-- and select the `before_user_created_hook` function.
-- ============================================================================

-- 1. Auth Hook: "Before User Created"
-- This is checked BEFORE the user record is inserted into auth.users.
-- Returns an error object to reject unauthorized emails.
create or replace function public.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_email text;
begin
  user_email := lower(trim(event->'user'->>'email'));

  if user_email is null or user_email not in (
    'nikhiltripathi911@gmail.com',
    'dwivedivaishnavi15@gmail.com'
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'This private space is not available for this account.'
      )
    );
  end if;

  -- Allow the user to be created
  return event;
end;
$$;

-- Grant execution to the Supabase auth admin role (required for hooks)
grant execute on function public.before_user_created_hook to supabase_auth_admin;

-- Revoke from all other roles — this function should NOT be callable by users
revoke execute on function public.before_user_created_hook from public;
revoke execute on function public.before_user_created_hook from anon;
revoke execute on function public.before_user_created_hook from authenticated;

-- 2. Defense-in-depth: BEFORE INSERT trigger on auth.users
-- Even if the hook is not enabled or bypassed, this trigger blocks unauthorized inserts.
create or replace function public.enforce_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(trim(new.email)) not in (
    'nikhiltripathi911@gmail.com',
    'dwivedivaishnavi15@gmail.com'
  ) then
    raise exception 'Unauthorized account'
      using hint = 'This private space is not available for this account.';
  end if;
  return new;
end;
$$;

-- Drop trigger if it exists (idempotent)
drop trigger if exists enforce_email_allowlist_trigger on auth.users;

create trigger enforce_email_allowlist_trigger
  before insert on auth.users
  for each row execute function public.enforce_email_allowlist();

-- 3. Auto-enrollment trigger: When an authorized user signs up,
-- automatically create their profile and add them to the private space.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_id uuid;
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

  -- Create profile
  insert into public.profiles (id, display_name, username, avatar_url, email)
  values (
    new.id,
    v_display_name,
    lower(split_part(new.email, '@', 1)),
    v_avatar_url,
    lower(new.email)
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  -- Get or create the single NOMORE space
  select id into v_space_id from public.private_spaces limit 1;
  
  if v_space_id is null then
    insert into public.private_spaces (name) values ('NOMORE')
    returning id into v_space_id;
  end if;

  -- Add user to the space
  insert into public.private_space_members (space_id, auth_user_id)
  values (v_space_id, new.id)
  on conflict (space_id, auth_user_id) do nothing;

  -- Create default user settings
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Create the single conversation if two members exist
  if (select count(*) from public.private_space_members where space_id = v_space_id) = 2 then
    -- Create conversation if none exists
    if not exists (select 1 from public.conversations where space_id = v_space_id) then
      insert into public.conversations (space_id) values (v_space_id);
    end if;
    
    -- Add both members to the conversation
    insert into public.conversation_members (conversation_id, user_id)
    select c.id, m.auth_user_id
    from public.conversations c
    cross join public.private_space_members m
    where c.space_id = v_space_id
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return new;
end;
$$;
