-- ════════════════════════════════════════════════════════════════════════
--  Brew & Focus — profile page (name, username, profile picture)
--
--  Run once in Supabase → SQL Editor → New query → Run. Safe to run again.
--  Needs supabase/cafes.sql to have been run first.
--
--  Adds a display name to profiles, a public "avatars" storage bucket where
--  each person can only upload into their own folder, and functions to read
--  and change your own profile. Usernames stay unique (ignoring capitals),
--  so inviting a friend by username always finds the right person.
-- ════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url  text;

-- ── Profile pictures ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Files live at avatars/<your user id>/…; you can only write to your own folder.
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_select_own on storage.objects;
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Your profile ────────────────────────────────────────────────────────
-- Read your own profile (creating the row if it's missing), plus the day
-- you joined.
create or replace function public.get_my_profile()
returns json language plpgsql security definer set search_path = public as $$
declare p public.profiles; joined timestamptz;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  insert into public.profiles (id, username)
    select u.id, coalesce(nullif(btrim(u.raw_user_meta_data->>'username'), ''), split_part(u.email, '@', 1))
    from auth.users u where u.id = auth.uid()
  on conflict (id) do nothing;
  select * into p from public.profiles where id = auth.uid();
  select created_at into joined from auth.users where id = auth.uid();
  return json_build_object('username', p.username, 'display_name', p.display_name,
                           'avatar_url', p.avatar_url, 'joined', joined);
end $$;

-- Change your name and/or username. Returns 'ok', 'taken' (someone else has
-- that username) or 'invalid' (username must be 2–24 letters, numbers, . _ -).
create or replace function public.set_my_profile(p_display_name text, p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare v_user text := btrim(coalesce(p_username, ''));
        v_name text := nullif(btrim(coalesce(p_display_name, '')), '');
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if v_user !~ '^[A-Za-z0-9._-]{2,24}$' then return 'invalid'; end if;
  if v_name is not null and char_length(v_name) > 40 then return 'invalid'; end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v_user) and id <> auth.uid()) then
    return 'taken';
  end if;
  insert into public.profiles (id, username, display_name) values (auth.uid(), v_user, v_name)
  on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;
  -- keep the name on your café seats in step
  update public.cafe_members set username = v_user where user_id = auth.uid();
  return 'ok';
end $$;

-- Set your profile picture to a file you uploaded to your own folder.
create or replace function public.set_my_avatar(p_url text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if p_url is not null and position('/storage/v1/object/public/avatars/' || auth.uid()::text || '/' in p_url) = 0 then
    raise exception 'That picture isn''t in your profile folder';
  end if;
  insert into public.profiles (id, username, avatar_url)
    values (auth.uid(), (select coalesce(nullif(btrim(raw_user_meta_data->>'username'), ''), split_part(email, '@', 1)) from auth.users where id = auth.uid()), p_url)
  on conflict (id) do update set avatar_url = excluded.avatar_url;
  -- nudge your café seats so friends at the table see the new picture straight away
  update public.cafe_members set username = username where user_id = auth.uid();
  return 'ok';
end $$;

-- Names and pictures of the people you share a café with (or who invited
-- you to one), so tables show "Selena Sun" and her portrait rather than a
-- bare username. Nobody else's profile is visible this way.
create or replace function public.cafe_people(p_ids uuid[])
returns table (id uuid, username text, display_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  -- (someone who signed in with Google and hasn't set a name shows their Google name)
  select p.id, p.username,
         coalesce(nullif(btrim(p.display_name), ''),
                  nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
                  nullif(btrim(u.raw_user_meta_data->>'name'), '')) as display_name,
         p.avatar_url
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = any(p_ids)
    and auth.uid() is not null
    and ( p.id = auth.uid()
       or exists (select 1 from public.cafe_members mine
                  join public.cafe_members theirs on theirs.cafe_id = mine.cafe_id
                  where mine.user_id = auth.uid() and theirs.user_id = p.id)
       or exists (select 1 from public.cafe_invites i
                  where i.to_user = auth.uid() and i.from_user = p.id) );
$$;

revoke execute on function public.get_my_profile()            from public, anon;
revoke execute on function public.set_my_profile(text, text)  from public, anon;
revoke execute on function public.set_my_avatar(text)         from public, anon;
revoke execute on function public.cafe_people(uuid[])         from public, anon;
grant  execute on function public.get_my_profile()            to authenticated;
grant  execute on function public.set_my_profile(text, text)  to authenticated;
grant  execute on function public.set_my_avatar(text)         to authenticated;
grant  execute on function public.cafe_people(uuid[])         to authenticated;
