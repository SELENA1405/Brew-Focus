-- ════════════════════════════════════════════════════════════════════════
--  Brew & Focus — friends ("calling cards") and the mailbox (letters)
--
--  Run once in Supabase → SQL Editor → New query → Run. Safe to run again.
--  Needs supabase/cafes.sql and supabase/profiles.sql to have been run first.
--
--  Leave your calling card for someone by their username; when they accept,
--  you're friends. If they had already left a card for you, leaving yours
--  makes you friends straight away. Either of you can withdraw a card,
--  decline one, or part ways later. Friends can write each other letters
--  (with an optional café invitation enclosed), and anyone signed in can
--  search for people by name or username to leave a card.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  addressee     uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','accepted')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester <> addressee)
);
-- one card per pair, whichever way round it was left
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on public.friendships(addressee);
create index if not exists friendships_requester_idx on public.friendships(requester);

alter table public.friendships enable row level security;

-- you can see and remove only the cards that involve you
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select to authenticated
  using (requester = auth.uid() or addressee = auth.uid());
drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete to authenticated
  using (requester = auth.uid() or addressee = auth.uid());

-- leaving and accepting cards goes through the functions below
revoke all on public.friendships from anon;
revoke insert, update on public.friendships from authenticated;
grant  select, delete on public.friendships to authenticated;

-- Leave your calling card for someone.
-- Returns 'sent', 'accepted' (they'd already left one for you), 'pending'
-- (your card is already waiting), 'already_friends', 'not_found' or 'yourself'.
create or replace function public.send_friend_request(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare v_to uuid; r public.friendships;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select id into v_to from public.profiles
    where lower(username) = lower(btrim(ltrim(btrim(coalesce(p_username, '')), '@'))) limit 1;
  if v_to is null then return 'not_found'; end if;
  if v_to = auth.uid() then return 'yourself'; end if;
  select * into r from public.friendships
    where least(requester, addressee) = least(auth.uid(), v_to)
      and greatest(requester, addressee) = greatest(auth.uid(), v_to);
  if r.id is not null then
    if r.status = 'accepted' then return 'already_friends'; end if;
    if r.requester = auth.uid() then return 'pending'; end if;
    update public.friendships set status = 'accepted', responded_at = now() where id = r.id;
    return 'accepted';
  end if;
  insert into public.friendships (requester, addressee) values (auth.uid(), v_to);
  return 'sent';
end $$;

-- Accept (or decline) a card someone left for you. Returns 'ok' or 'not_found'.
create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare r public.friendships;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select * into r from public.friendships where id = p_id and addressee = auth.uid() and status = 'pending';
  if r.id is null then return 'not_found'; end if;
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now() where id = p_id;
  else
    delete from public.friendships where id = p_id;
  end if;
  return 'ok';
end $$;

-- Your card box: friends, cards waiting for you, and cards you've left,
-- with each person's name, picture and café character.
create or replace function public.my_friends()
returns table (id uuid, user_id uuid, username text, display_name text, avatar_url text,
               look jsonb, status text, direction text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.id,
         p.id,
         p.username,
         coalesce(nullif(btrim(p.display_name), ''),
                  nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
                  nullif(btrim(u.raw_user_meta_data->>'name'), '')),
         p.avatar_url,
         p.look,
         f.status,
         case when f.requester = auth.uid() then 'out' else 'in' end,
         coalesce(f.responded_at, f.created_at)
  from public.friendships f
  join public.profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  left join auth.users u on u.id = p.id
  where auth.uid() is not null and (f.requester = auth.uid() or f.addressee = auth.uid())
  order by f.status desc, coalesce(f.responded_at, f.created_at) desc;
$$;

revoke execute on function public.send_friend_request(text)              from public, anon;
revoke execute on function public.respond_friend_request(uuid, boolean)  from public, anon;
revoke execute on function public.my_friends()                           from public, anon;
grant  execute on function public.send_friend_request(text)              to authenticated;
grant  execute on function public.respond_friend_request(uuid, boolean)  to authenticated;
grant  execute on function public.my_friends()                           to authenticated;

-- ── The mailbox: letters between friends ────────────────────────────────
create table if not exists public.letters (
  id          uuid primary key default gen_random_uuid(),
  sender      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient   uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  cafe_id     uuid references public.cafes(id) on delete set null,   -- an enclosed café invitation
  cafe_name   text,
  cafe_code   text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  check (sender <> recipient)
);
create index if not exists letters_recipient_idx on public.letters(recipient, created_at desc);
create index if not exists letters_sender_idx on public.letters(sender, created_at desc);

alter table public.letters enable row level security;
-- you can read only letters you wrote or received; writing goes through send_letter
drop policy if exists letters_select on public.letters;
create policy letters_select on public.letters for select to authenticated
  using (sender = auth.uid() or recipient = auth.uid());
revoke all on public.letters from anon;
revoke insert, update, delete on public.letters from authenticated;
grant  select on public.letters to authenticated;

-- Post a letter to a friend, optionally enclosing an invitation to a café
-- you're sitting in (which also sends them the usual café invitation).
-- Returns 'sent', 'not_friends', 'not_member', 'empty' or 'too_long'.
create or replace function public.send_letter(p_to uuid, p_body text, p_cafe uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_body text := btrim(coalesce(p_body, '')); c public.cafes; v_from text;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if char_length(v_body) > 1000 then return 'too_long'; end if;
  if char_length(v_body) = 0 and p_cafe is null then return 'empty'; end if;
  if not exists (select 1 from public.friendships where status = 'accepted'
                   and least(requester, addressee) = least(auth.uid(), p_to)
                   and greatest(requester, addressee) = greatest(auth.uid(), p_to)) then
    return 'not_friends';
  end if;
  if p_cafe is not null then
    select * into c from public.cafes where id = p_cafe;
    select username into v_from from public.cafe_members where cafe_id = p_cafe and user_id = auth.uid();
    if c.id is null or v_from is null then return 'not_member'; end if;
    if not exists (select 1 from public.cafe_members where cafe_id = p_cafe and user_id = p_to) then
      insert into public.cafe_invites (cafe_id, from_user, from_username, to_user)
        values (p_cafe, auth.uid(), v_from, p_to) on conflict (cafe_id, to_user) do nothing;
    end if;
    if char_length(v_body) = 0 then v_body := 'Come and study with me at ' || c.name || '.'; end if;
  end if;
  insert into public.letters (sender, recipient, body, cafe_id, cafe_name, cafe_code)
    values (auth.uid(), p_to, v_body, c.id, c.name, c.invite_code);
  return 'sent';
end $$;

-- Mark the letters a friend sent you as read. Returns how many.
create or replace function public.mark_letters_read(p_from uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  update public.letters set read_at = now()
    where recipient = auth.uid() and sender = p_from and read_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- Find people by name or username (at least two letters), with whether
-- you're already friends or have a card waiting either way.
create or replace function public.search_people(p_query text)
returns table (user_id uuid, username text, display_name text, look jsonb, status text)
language sql stable security definer set search_path = public as $$
  with q as (
    select lower(btrim(ltrim(btrim(coalesce(p_query, '')), '@'))) as s
  ), e as (
    select s, replace(replace(replace(s, '\', '\\'), '%', '\%'), '_', '\_') as pat from q
  )
  select p.id,
         p.username,
         coalesce(nullif(btrim(p.display_name), ''),
                  nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
                  nullif(btrim(u.raw_user_meta_data->>'name'), '')),
         p.look,
         coalesce((select case when f.status = 'accepted' then 'friend'
                               when f.requester = auth.uid() then 'outgoing' else 'incoming' end
                   from public.friendships f
                   where least(f.requester, f.addressee) = least(auth.uid(), p.id)
                     and greatest(f.requester, f.addressee) = greatest(auth.uid(), p.id)), 'none')
  from public.profiles p
  left join auth.users u on u.id = p.id
  cross join e
  where auth.uid() is not null and char_length(e.s) >= 2 and p.id <> auth.uid() and p.username is not null
    and (lower(p.username) like '%' || e.pat || '%' escape '\'
         or lower(coalesce(p.display_name, '')) like '%' || e.pat || '%' escape '\')
  order by (lower(p.username) = e.s) desc, (lower(p.username) like e.pat || '%' escape '\') desc, lower(p.username)
  limit 12;
$$;

revoke execute on function public.send_letter(uuid, text, uuid)  from public, anon;
revoke execute on function public.mark_letters_read(uuid)        from public, anon;
revoke execute on function public.search_people(text)            from public, anon;
grant  execute on function public.send_letter(uuid, text, uuid)  to authenticated;
grant  execute on function public.mark_letters_read(uuid)        to authenticated;
grant  execute on function public.search_people(text)            to authenticated;

-- Live updates, so cards and letters that arrive show up straight away.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['friendships', 'letters'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
