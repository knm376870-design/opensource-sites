-- 俄语星球：在 Supabase SQL Editor 中一次性执行。
-- 浏览器只能使用 publishable key；不要把 secret/service_role key 放进网站。

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.admin_users from public, anon, authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from private.admin_users where user_id = (select auth.uid())) $$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorites jsonb not null default '[]'::jsonb,
  study_history jsonb not null default '{}'::jsonb,
  roadmap jsonb not null default '{}'::jsonb,
  practice_best jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint favorites_array check (jsonb_typeof(favorites) = 'array' and jsonb_array_length(favorites) <= 500),
  constraint study_history_object check (jsonb_typeof(study_history) = 'object'),
  constraint roadmap_object check (jsonb_typeof(roadmap) = 'object'),
  constraint practice_best_object check (jsonb_typeof(practice_best) = 'object'),
  constraint state_size_limit check (pg_column_size(favorites) + pg_column_size(study_history) + pg_column_size(roadmap) + pg_column_size(practice_best) <= 300000)
);

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
revoke all on public.profiles, public.user_state from public, anon, authenticated;
grant select, insert, update on public.profiles, public.user_state to authenticated;

drop policy if exists "profile owner or admin reads" on public.profiles;
create policy "profile owner or admin reads" on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));
drop policy if exists "profile owner inserts" on public.profiles;
create policy "profile owner inserts" on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
drop policy if exists "profile owner updates" on public.profiles;
create policy "profile owner updates" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "state owner or admin reads" on public.user_state;
create policy "state owner or admin reads" on public.user_state for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
drop policy if exists "state owner inserts" on public.user_state;
create policy "state owner inserts" on public.user_state for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists "state owner updates" on public.user_state;
create policy "state owner updates" on public.user_state for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin insert into public.profiles(id) values(new.id) on conflict (id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.is_admin() $$;
revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;

-- 站长首次登录后，把下面邮箱替换为自己的邮箱并单独执行：
-- insert into private.admin_users(user_id)
-- select id from auth.users where email = 'YOUR_EMAIL@example.com'
-- on conflict (user_id) do nothing;
