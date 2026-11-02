-- ════════════════════════════════════════════════════════════════════════
--  Brew & Focus — Study Café backend
--
--  Run this once in your Supabase project: Dashboard → SQL Editor → New
--  query → paste this whole file → Run. It is safe to run again later.
--
--  It creates:
--    cafes          one row per café (name, vibe, invite code, shared timer)
--    cafe_members   who is seated at each café, and the drink in front of them
--    cafe_invites   invitations sent to a friend's username
--  plus server functions for creating, joining, inviting and the shared
--  timer, and row-level security so only a café's members can see it.
--
--  Requires the existing public.profiles table (id uuid, username text).
-- ════════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────
create table if not exists public.cafes (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (char_length(btrim(name)) between 1 and 60),
  vibe                 text not null default 'parisian'
                         check (vibe in ('parisian','bookstore','kyoto','midnight','library','beach')),
  owner_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invite_code          text not null unique
                         default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  -- Shared timer. Running while timer_started_at is set; the time left is
  -- timer_remaining_secs minus the seconds since timer_started_at.
  timer_duration_secs  int  not null default 1500 check (timer_duration_secs between 60 and 14400),
  timer_remaining_secs int  not null default 1500 check (timer_remaining_secs >= 0),
  timer_started_at     timestamptz,
  created_at           timestamptz not null default now()
);

-- Café types change over time (the Fireside Cabin became the Beach Café):
-- keep the allowed list current on databases created by an earlier version.
do $$
begin
  alter table public.cafes drop constraint if exists cafes_vibe_check;
  update public.cafes set vibe = 'beach' where vibe = 'cabin';
  alter table public.cafes add constraint cafes_vibe_check
    check (vibe in ('parisian','bookstore','kyoto','midnight','library','beach'));
end $$;

create table if not exists public.cafe_members (
  cafe_id    uuid not null references public.cafes(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  username   text not null check (char_length(btrim(username)) between 1 and 40),
  drink      jsonb,           -- { drink, base, cup, addons[], label, how: 'brewed' | 'ordered' }
  joined_at  timestamptz not null default now(),
  primary key (cafe_id, user_id)
);
create index if not exists cafe_members_user_idx on public.cafe_members(user_id);

create table if not exists public.cafe_invites (
  id             uuid primary key default gen_random_uuid(),
  cafe_id        uuid not null references public.cafes(id) on delete cascade,
  from_user      uuid not null references auth.users(id) on delete cascade,
  from_username  text not null,
  to_user        uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (cafe_id, to_user)
);
create index if not exists cafe_invites_to_idx on public.cafe_invites(to_user);

-- ── Helper ──────────────────────────────────────────────────────────────
-- Security definer so policies can ask "is the caller seated here?" without
-- recursing through cafe_members' own policy.
create or replace function public.is_cafe_member(p_cafe uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cafe_members where cafe_id = p_cafe and user_id = auth.uid());
$$;

-- ── Row-level security ──────────────────────────────────────────────────
alter table public.cafes        enable row level security;
alter table public.cafe_members enable row level security;
alter table public.cafe_invites enable row level security;

-- Cafés: visible to members and to anyone holding an invitation to them.
drop policy if exists cafes_select on public.cafes;
create policy cafes_select on public.cafes for select to authenticated using (
  owner_id = auth.uid()
  or public.is_cafe_member(id)
  or exists (select 1 from public.cafe_invites i where i.cafe_id = cafes.id and i.to_user = auth.uid())
);
-- Only the owner may rename, change the vibe, or close (delete) the café.
drop policy if exists cafes_update on public.cafes;
create policy cafes_update on public.cafes for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists cafes_delete on public.cafes;
create policy cafes_delete on public.cafes for delete to authenticated using (owner_id = auth.uid());

-- Members: you can see everyone at your tables, change your own drink or
-- name, and leave (or, as owner, ask someone to leave).
drop policy if exists members_select on public.cafe_members;
create policy members_select on public.cafe_members for select to authenticated
  using (public.is_cafe_member(cafe_id));
drop policy if exists members_update on public.cafe_members;
create policy members_update on public.cafe_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists members_delete on public.cafe_members;
create policy members_delete on public.cafe_members for delete to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.cafes c where c.id = cafe_id and c.owner_id = auth.uid())
);

-- Invites: the sender and the recipient can see and remove them.
drop policy if exists invites_select on public.cafe_invites;
create policy invites_select on public.cafe_invites for select to authenticated
  using (to_user = auth.uid() or from_user = auth.uid());
drop policy if exists invites_delete on public.cafe_invites;
create policy invites_delete on public.cafe_invites for delete to authenticated
  using (to_user = auth.uid() or from_user = auth.uid());

-- Column-level limits. Creating, joining, inviting and the timer all go
-- through the functions below, so direct writes are kept narrow.
revoke all on public.cafes, public.cafe_members, public.cafe_invites from anon;
revoke insert, update on public.cafes from authenticated;
grant  select, delete on public.cafes to authenticated;
grant  update (name, vibe) on public.cafes to authenticated;
revoke insert, update on public.cafe_members from authenticated;
grant  select, delete on public.cafe_members to authenticated;
grant  update (drink, username) on public.cafe_members to authenticated;
revoke insert, update on public.cafe_invites from authenticated;
grant  select, delete on public.cafe_invites to authenticated;

-- ── Functions ───────────────────────────────────────────────────────────
-- Open a café and take the first seat.
create or replace function public.create_cafe(p_name text, p_vibe text, p_username text)
returns public.cafes language plpgsql security definer set search_path = public as $$
declare c public.cafes;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  insert into public.cafes (name, vibe, owner_id) values (btrim(p_name), p_vibe, auth.uid()) returning * into c;
  insert into public.cafe_members (cafe_id, user_id, username) values (c.id, auth.uid(), btrim(p_username));
  return c;
end $$;

-- Join with an invite code (from a link, typed in, or from an invitation).
create or replace function public.join_cafe(p_code text, p_username text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_cafe uuid; v_seats int;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select id into v_cafe from public.cafes where invite_code = upper(btrim(p_code));
  if v_cafe is null then raise exception 'No café found with that code'; end if;
  if not exists (select 1 from public.cafe_members where cafe_id = v_cafe and user_id = auth.uid()) then
    select count(*) into v_seats from public.cafe_members where cafe_id = v_cafe;
    if v_seats >= 8 then raise exception 'This café is full (8 seats)'; end if;
    insert into public.cafe_members (cafe_id, user_id, username) values (v_cafe, auth.uid(), btrim(p_username));
  end if;
  delete from public.cafe_invites where cafe_id = v_cafe and to_user = auth.uid();
  return v_cafe;
end $$;

-- Invite a friend by their Brew & Focus username.
-- Returns 'sent', 'not_found', 'already_member' or 'yourself'.
create or replace function public.invite_to_cafe(p_cafe uuid, p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare v_to uuid; v_from_name text;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select username into v_from_name from public.cafe_members where cafe_id = p_cafe and user_id = auth.uid();
  if v_from_name is null then raise exception 'Only people at this café can invite friends'; end if;
  select id into v_to from public.profiles where lower(username) = lower(btrim(p_username)) limit 1;
  if v_to is null then return 'not_found'; end if;
  if v_to = auth.uid() then return 'yourself'; end if;
  if exists (select 1 from public.cafe_members where cafe_id = p_cafe and user_id = v_to) then return 'already_member'; end if;
  insert into public.cafe_invites (cafe_id, from_user, from_username, to_user)
    values (p_cafe, auth.uid(), v_from_name, v_to)
    on conflict (cafe_id, to_user) do nothing;
  return 'sent';
end $$;

-- The shared timer, controlled by the café owner. Uses the server clock so
-- everyone at the table counts down together.
-- p_action: 'start' | 'pause' | 'reset' | 'set' (with p_secs)
create or replace function public.cafe_timer(p_cafe uuid, p_action text, p_secs int default null)
returns public.cafes language plpgsql security definer set search_path = public as $$
declare c public.cafes;
begin
  select * into c from public.cafes where id = p_cafe for update;
  if c.id is null or c.owner_id is distinct from auth.uid() then
    raise exception 'Only the café owner can control the timer';
  end if;
  if p_action = 'start' then
    if c.timer_started_at is null then
      update public.cafes set
        timer_started_at = now(),
        timer_remaining_secs = case when timer_remaining_secs <= 0 then timer_duration_secs else timer_remaining_secs end
      where id = p_cafe;
    end if;
  elsif p_action = 'pause' then
    if c.timer_started_at is not null then
      update public.cafes set
        timer_remaining_secs = greatest(0, timer_remaining_secs - floor(extract(epoch from now() - timer_started_at))::int),
        timer_started_at = null
      where id = p_cafe;
    end if;
  elsif p_action = 'reset' then
    update public.cafes set timer_remaining_secs = timer_duration_secs, timer_started_at = null where id = p_cafe;
  elsif p_action = 'set' then
    if p_secs is null or p_secs < 60 or p_secs > 14400 then raise exception 'Choose between 1 and 240 minutes'; end if;
    update public.cafes set timer_duration_secs = p_secs, timer_remaining_secs = p_secs, timer_started_at = null where id = p_cafe;
  else
    raise exception 'Unknown timer action %', p_action;
  end if;
  select * into c from public.cafes where id = p_cafe;
  return c;
end $$;

-- The server's clock, so each browser can correct for its own clock drift.
create or replace function public.server_now()
returns timestamptz language sql stable as $$ select now() $$;

revoke execute on function public.create_cafe(text, text, text)    from public, anon;
revoke execute on function public.join_cafe(text, text)            from public, anon;
revoke execute on function public.invite_to_cafe(uuid, text)       from public, anon;
revoke execute on function public.cafe_timer(uuid, text, int)      from public, anon;
grant  execute on function public.create_cafe(text, text, text)    to authenticated;
grant  execute on function public.join_cafe(text, text)            to authenticated;
grant  execute on function public.invite_to_cafe(uuid, text)       to authenticated;
grant  execute on function public.cafe_timer(uuid, text, int)      to authenticated;
grant  execute on function public.server_now()                     to authenticated, anon;

-- ── Realtime ────────────────────────────────────────────────────────────
-- Lets everyone at a table see drinks, seats and the timer change live.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['cafes', 'cafe_members', 'cafe_invites'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
