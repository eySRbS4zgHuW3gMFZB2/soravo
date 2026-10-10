-- R1-GAP-021: desktop authorization codes for the PKCE deep-link flow.
--
-- The website (authenticated user session) mints a single-use authorization
-- `code` bound to the desktop's PKCE S256 challenge; the desktop exchanges
-- code + verifier for Supabase session tokens via the desktop-auth-exchange
-- Edge Function. Only the SHA-256 of the code is stored — the code itself is
-- shown once to the minting user session and never persisted.
--
-- Security model (ADR-011 / 12_SECURITY_BASELINE.md):
--   * No client privilege at all: anon/authenticated receive no grants and no
--     policies. Both Edge Functions act with the service role (server-only);
--     the mint function additionally confirms the caller's user JWT against
--     the authoritative Auth API before writing.
--   * Single-use is enforced by an atomic consume (`consumed_at IS NULL`
--     compare-and-swap in the exchange function); a consumed or expired code
--     can never yield a session, and concurrent exchanges cannot double-spend.
--   * Codes expire 5 minutes after creation; user deletion cascades.
--   * No tokens, passwords, or PII are stored here — only the code hash, the
--     public challenge/state, and lifecycle timestamps.

begin;

create table public.desktop_auth_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  code_challenge text not null,
  state text not null,
  expires_at timestamptz not null default now() + interval '5 minutes',
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint desktop_auth_codes_hash_format check (code_hash ~ '^[0-9a-f]{64}$'),
  constraint desktop_auth_codes_challenge_length check (
    char_length(code_challenge) between 43 and 128
  ),
  constraint desktop_auth_codes_state_length check (
    char_length(state) between 1 and 256
  ),
  constraint desktop_auth_codes_expires_after_created check (expires_at >= created_at),
  constraint desktop_auth_codes_consumed_after_created check (
    consumed_at is null or consumed_at >= created_at
  ),
  constraint desktop_auth_codes_hash_unique unique (code_hash)
);

comment on table public.desktop_auth_codes is
  'Single-use desktop authorization codes (R1-GAP-021). Stores the SHA-256 of '
  'the code only, bound to the desktop PKCE challenge. No tokens or passwords.';

alter table public.desktop_auth_codes enable row level security;

-- Service-role access for the two Edge Functions only (insert + select +
-- update for mint/consume; never delete — expired rows age out via cascade
-- on user deletion and a future retention job, never via client action).
grant select, insert, update on table public.desktop_auth_codes to service_role;

create index desktop_auth_codes_user_id_idx
  on public.desktop_auth_codes (user_id);
create index desktop_auth_codes_expires_at_idx
  on public.desktop_auth_codes (expires_at)
  where consumed_at is null;

commit;
