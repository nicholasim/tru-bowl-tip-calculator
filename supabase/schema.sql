-- TRU Bowl Tip Calculator - Supabase schema
--
-- Run this whole file once in the Supabase SQL editor (Database > SQL Editor > New query).
-- It is safe to re-run: objects are created with IF NOT EXISTS / OR REPLACE where possible,
-- but DROP POLICY IF EXISTS is used before each CREATE POLICY so policies can be redefined.
--
-- IMPORTANT manual step (cannot be done from SQL):
-- In the Supabase dashboard, go to Authentication > Sign In / Providers > Email and turn
-- OFF "Confirm email". Usernames are mapped to fake addresses
-- (uid_<username>@trubowl.internal) that can never receive a confirmation link, so signups
-- would otherwise be stuck unconfirmed and unable to sign in.

-- ============================================================================
-- profiles
-- ============================================================================
-- One row per authenticated user. id == auth.users.id. username is what the
-- user types to log in; the real (hidden) sign-in email is derived from it as
-- uid_<lower(username)>@trubowl.internal -- see get_login_email() below, and
-- keep that formula in sync with src/lib/auth.js's toInternalEmail().

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_-]{3,20}$')
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================================
-- employees (the roster)
-- ============================================================================
-- id is a client-generated id (nanoid), not a uuid, so it round-trips with the
-- ids already used in the app's localStorage model.

create table if not exists public.employees (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Patches the column onto a database that ran this file before `active`
-- existed. Removing an employee soft-deletes (active = false) rather than
-- deleting the row, so their name survives on historical tip/hours entries
-- instead of falling back to a generic "Former employee" label.
alter table public.employees add column if not exists active boolean not null default true;

create index if not exists employees_user_id_idx on public.employees (user_id);

alter table public.employees enable row level security;

drop policy if exists "employees_own_rows" on public.employees;
create policy "employees_own_rows" on public.employees
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- pay_periods
-- ============================================================================

create table if not exists public.pay_periods (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists pay_periods_user_id_idx on public.pay_periods (user_id);

alter table public.pay_periods enable row level security;

drop policy if exists "pay_periods_own_rows" on public.pay_periods;
create policy "pay_periods_own_rows" on public.pay_periods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- daily_entries (one row per day within a pay period: cash/app/credit tips)
-- ============================================================================

create table if not exists public.daily_entries (
  pay_period_id text not null references public.pay_periods(id) on delete cascade,
  entry_date date not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tips_cash numeric(10, 2) not null default 0,
  tips_app numeric(10, 2) not null default 0,
  tips_credit numeric(10, 2) not null default 0,
  primary key (pay_period_id, entry_date)
);

create index if not exists daily_entries_user_id_idx on public.daily_entries (user_id);

alter table public.daily_entries enable row level security;

drop policy if exists "daily_entries_own_rows" on public.daily_entries;
create policy "daily_entries_own_rows" on public.daily_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- entry_hours (hours worked per employee, per day)
-- ============================================================================
-- employee_id intentionally has NO foreign key to employees(id). The app lets
-- an employee be removed from the roster while keeping their historical tip
-- records (shown in the UI as "Former employee"), so hours rows must be able
-- to outlive the employees row they once pointed to.

create table if not exists public.entry_hours (
  pay_period_id text not null,
  entry_date date not null,
  employee_id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  hours numeric(6, 2),
  primary key (pay_period_id, entry_date, employee_id),
  foreign key (pay_period_id, entry_date)
    references public.daily_entries(pay_period_id, entry_date) on delete cascade
);

create index if not exists entry_hours_user_id_idx on public.entry_hours (user_id);

alter table public.entry_hours enable row level security;

drop policy if exists "entry_hours_own_rows" on public.entry_hours;
create policy "entry_hours_own_rows" on public.entry_hours
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- Table privileges
-- ============================================================================
-- Postgres checks base table grants BEFORE evaluating RLS policies. Tables
-- created via the SQL editor don't automatically grant anything to the
-- authenticated/anon roles (unlike tables made through the Table Editor UI),
-- so without these grants every query fails with "permission denied for
-- table ..." regardless of how correct the RLS policies above are -- RLS only
-- narrows which *rows* a query can see/touch on top of these grants.

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.pay_periods to authenticated;
grant select, insert, update, delete on public.daily_entries to authenticated;
grant select, insert, update, delete on public.entry_hours to authenticated;

-- ============================================================================
-- get_login_email(username) - lets a signed-out client resolve a username to
-- its hidden sign-in email so it can call auth.signInWithPassword().
-- ============================================================================
-- SECURITY DEFINER so it can read profiles despite the caller being
-- unauthenticated (RLS above blocks anon reads of profiles entirely). It only
-- ever returns a single derived email string, never raw profile rows, so it
-- can't be used to enumerate usernames/ids.

create or replace function public.get_login_email(p_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select 'uid_' || lower(p_username) || '@trubowl.internal'
  from public.profiles
  where lower(username) = lower(p_username)
  limit 1;
$$;

revoke all on function public.get_login_email(text) from public;
grant execute on function public.get_login_email(text) to anon, authenticated;
