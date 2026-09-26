-- CLOUD-011: Webhook idempotency ledger for Razorpay.
--
-- Introduces the `webhook_events` table — the deduplication boundary for
-- Razorpay webhook deliveries. Each incoming webhook is recorded by its
-- composite key (event_type:payment_id) before processing; duplicates are
-- rejected at the database level via a unique constraint. This guarantees
-- exactly-once entitlement activation even under Razorpay's at-least-once
-- delivery semantics.
--
-- Security model:
--   * service_role only: no authenticated/anon grants, no RLS policies.
--   * The webhook handler (Edge Function) writes via service_role.
--   * No client path ever reads or writes this table.
--   * No payment credentials stored — only opaque event identifiers.
--
-- Scope boundary: no entitlement logic here; that remains in the webhook
-- handler. This table ONLY provides the idempotency key.

begin;

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  constraint webhook_events_event_id_unique unique (event_id)
);

comment on table public.webhook_events is
  'Idempotency ledger for Razorpay webhook deliveries. event_id is the '
  'composite key (event_type:payment_id) deduplicated at the database boundary. '
  'Service-role writes only; no authenticated/anon access. Stores no payment '
  'credentials, audio, transcripts, keystrokes, clipboard contents, or history.';

alter table public.webhook_events enable row level security;

-- No policies: service_role bypasses RLS by default. Authenticated/anon have
-- no grants and no policies, so all access is denied.

grant select, insert on table public.webhook_events to service_role;

create index webhook_events_processed_at_idx on public.webhook_events (processed_at);

commit;