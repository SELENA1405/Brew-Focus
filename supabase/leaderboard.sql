-- ════════════════════════════════════════════════════════════════════════
--  Brew & Focus — the Leaderboard (study hours among friends)
--
--  Run once in Supabase → SQL Editor → New query → Run. Safe to run again.
--  Needs supabase/profiles.sql and supabase/friends.sql to have been run first.
--
--  Totals every finished study session for you and each of your friends,
--  so the Leaderboard can rank who has spent the most time at the desk. Only the
--  totals are shared — never subjects, tasks or recipes — and only between
--  people who are friends.
-- ════════════════════════════════════════════════════════════════════════

create index if not exists study_sessions_user_idx on public.study_sessions(user_id);

drop function if exists public.friends_leaderboard();
create function public.friends_leaderboard()
returns table (user_id uuid, username text, display_name text, avatar_url text,
               look jsonb, minutes bigint, sessions bigint)
language sql stable security definer set search_path = public as $$
  with people as (
    select auth.uid() as id
    union
    select case when f.requester = auth.uid() then f.addressee else f.requester end
    from public.friendships f
    where f.status = 'accepted' and (f.requester = auth.uid() or f.addressee = auth.uid())
  )
  select p.id,
         pr.username,
         coalesce(nullif(btrim(pr.display_name), ''),
                  nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
                  nullif(btrim(u.raw_user_meta_data->>'name'), '')),
         pr.avatar_url,
         pr.look,
         coalesce(sum(s.duration), 0)::bigint,
         count(s.user_id)::bigint
  from people p
  join public.profiles pr on pr.id = p.id
  left join auth.users u on u.id = p.id
  left join public.study_sessions s on s.user_id = p.id and coalesce(s.completed, true)
  where auth.uid() is not null
  group by p.id, pr.username, pr.display_name, pr.avatar_url, pr.look,
           u.raw_user_meta_data
  order by 6 desc, 2 asc;
$$;

revoke execute on function public.friends_leaderboard() from public, anon;
grant  execute on function public.friends_leaderboard() to authenticated;
