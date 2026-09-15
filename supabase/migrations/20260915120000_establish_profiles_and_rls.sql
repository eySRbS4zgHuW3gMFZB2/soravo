-- CLOUD-002: Supabase authentication/account foundation — profiles.
--
-- Introduces the application `profiles` table (account representation per
-- 02_TDD.md §12–13) owned by `postgres` in the default-deny `public` schema
-- established by CLOUD-001 (20260915000000_establish_supabase_baseline.sql,
-- ADR-010). RLS is enabled and the minimal self-owned policies are created in
-- the SAME migration as the explicit grants (ENFORCED by the migration-guard
-- test suite). Only the `authenticated` role receives access; `anon` and
-- `service_role` receive no table privileges and no bypass of RLS.
--
-- Scope boundary (CLOUD-002): this table is the account/profile foundation
-- only. Entitlements (CLOUD-004), devices/sessions (CLOUD-005), admin roles
-- (CLOUD-006) and their RLS are deliberately not introduced here.
--
-- No SECURITY DEFINER functions are created. The timestamps trigger runs with
-- invoker privileges and only normalizes column values on rows that already
-- passed RLS. No audio, transcripts, keystrokes, clipboard, or history is
-- ever stored here (01_PRD.md §10).

begin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 80)
);

comment on table public.profiles is
  'Account representation for authenticated Soravo users. Holds only account '
  'metadata; never audio, transcripts, keystrokes, clipboard contents, or history.';

alter table public.profiles enable row level security;

-- Keeps server-owned timestamp integrity. Plain (SECURITY INVOKER) function:
-- rows already passed RLS; the trigger cannot be used to read or write other
-- rows. Direct invocation by anon/service_role is revoked below.
create or replace function public.profiles_set_timestamps()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.profiles_set_timestamps() from anon, service_role;

create trigger profiles_set_timestamps
  before insert or update on public.profiles
  for each row
  execute function public.profiles_set_timestamps();

-- A user may read only their own profile row (auth.uid() is server-derived
-- from the verified access token JWT, never from user-editable metadata).
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- A user may create their own profile row on first sign-in, but may never
-- claim another user's id: the WITH CHECK bounds the new row to auth.uid().
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

-- A user may update their own profile, but may never reassign the row to
-- another user: UPDATE WITH CHECK pairs the USING ownership predicate.
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Deliberately no DELETE policy: account/profiles deletion is not exposed in
-- this task (02_TDD.md §12 account model; deferred — see progress/NEXT.md).

grant select, insert, update on table public.profiles to authenticated;

commit;