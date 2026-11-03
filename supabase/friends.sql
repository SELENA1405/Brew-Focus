-- ════════════════════════════════════════════════════════════════════════
--  Brew & Focus — friends ("calling cards")
--
--  Run once in Supabase → SQL Editor → New query → Run. Safe to run again.
--  Needs supabase/cafes.sql and supabase/profiles.sql to have been run first.
--
--  Leave your calling card for someone by their username; when they accept,
--  you're friends. If they had already left a card for you, leaving yours
--  makes you friends straight away. Either of you can withdraw a card,
--  decline one, or part ways later.
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

-- Live updates, so a card that arrives shows up straight away.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships') then
    alter publication supabase_realtime add table public.friendships;
  end if;
end $$;
