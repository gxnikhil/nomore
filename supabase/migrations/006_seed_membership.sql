-- ============================================================================
-- NOMORE: Migration 006 - Seed Membership for Authorized Users
-- ============================================================================

do $$
declare
  v_space_id uuid;
  v_u1 uuid;
  v_u2 uuid;
  v_conv_id uuid;
begin
  -- 1. Ensure private space exists
  select id into v_space_id from public.private_spaces limit 1;
  if v_space_id is null then
    insert into public.private_spaces (name) values ('NOMORE') returning id into v_space_id;
  end if;

  -- 2. Lookup auth user IDs for authorized emails
  select id into v_u1 from auth.users where lower(email) = 'nikhiltripathi911@gmail.com';
  select id into v_u2 from auth.users where lower(email) = 'dwivedivaishnavi15@gmail.com';

  -- 3. Ensure profiles & space membership for User 1
  if v_u1 is not null then
    insert into public.profiles (id, display_name, username, email)
    values (v_u1, 'Nikhil', 'nikhiltripathi911', 'nikhiltripathi911@gmail.com')
    on conflict (id) do update set email = excluded.email;

    insert into public.private_space_members (space_id, auth_user_id)
    values (v_space_id, v_u1)
    on conflict (space_id, auth_user_id) do nothing;

    insert into public.user_settings (user_id)
    values (v_u1)
    on conflict (user_id) do nothing;
  end if;

  -- 4. Ensure profiles & space membership for User 2
  if v_u2 is not null then
    insert into public.profiles (id, display_name, username, email)
    values (v_u2, 'Vaishnavi', 'dwivedivaishnavi15', 'dwivedivaishnavi15@gmail.com')
    on conflict (id) do update set email = excluded.email;

    insert into public.private_space_members (space_id, auth_user_id)
    values (v_space_id, v_u2)
    on conflict (space_id, auth_user_id) do nothing;

    insert into public.user_settings (user_id)
    values (v_u2)
    on conflict (user_id) do nothing;
  end if;

  -- 5. Ensure single private conversation exists for the space
  select id into v_conv_id from public.conversations where space_id = v_space_id limit 1;
  if v_conv_id is null then
    insert into public.conversations (space_id) values (v_space_id) returning id into v_conv_id;
  end if;

  -- 6. Ensure conversation membership for both users
  if v_u1 is not null then
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conv_id, v_u1)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  if v_u2 is not null then
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conv_id, v_u2)
    on conflict (conversation_id, user_id) do nothing;
  end if;
end $$;
