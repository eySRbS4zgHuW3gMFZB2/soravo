-- CLOUD-012: Make entitlements provider constraint provider-neutral.
--
-- The original entitlements_provider_check constraint (provider = 'razorpay')
-- is removed and replaced with a provider-neutral invariant: provider must be
-- non-empty text. This preserves the constraint name while changing semantics.
--
-- Payment-provider neutrality (01_PRD.md §10; 02_TDD.md §13):
--   * provider is an opaque identifier (payment gateway customer_id or similar)
--   * provider_customer_ref and provider_payment_ref are also opaque identifiers
--   * No payment credentials (card numbers, CVV, secrets) are ever stored
--   * The entitlement model supports any payment provider without redesign
--
-- The migration:
--   1. Drops the old razorpay-specific CHECK constraint
--   2. Creates a new CHECK constraint ensuring provider IS NOT NULL AND provider <> ''
--   3. Leaves all other entitlements invariants intact
--
-- This migration is backward-compatible: existing rows with provider='razorpay'
-- will continue to satisfy the new constraint.

begin;

-- Drop the old razorpay-specific provider constraint
alter table public.entitlements
  drop constraint if exists entitlements_provider_check;

-- Add provider-neutral constraint: provider must be non-empty
alter table public.entitlements
  add constraint entitlements_provider_check check (provider is not null and provider <> '');

commit;
