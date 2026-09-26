-- Migration: Add provider_order_ref and provider_subscription_ref to entitlements
-- Purpose: Support reconciliation for Option A (Razorpay Subscriptions for monthly, Orders for lifetime)
-- Date: 2026-09-27

-- Add provider_order_ref for one-time order reconciliation (lifetime)
ALTER TABLE public.entitlements
ADD COLUMN IF NOT EXISTS provider_order_ref text;

-- Add provider_subscription_ref for subscription reconciliation (monthly)
ALTER TABLE public.entitlements
ADD COLUMN IF NOT EXISTS provider_subscription_ref text;

-- Add indexes for faster reconciliation lookups
CREATE INDEX IF NOT EXISTS entitlements_provider_order_ref_idx
ON public.entitlements (provider_order_ref)
WHERE provider_order_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS entitlements_provider_subscription_ref_idx
ON public.entitlements (provider_subscription_ref)
WHERE provider_subscription_ref IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN public.entitlements.provider_order_ref IS
'Razorpay order_id for one-time lifetime purchases. Null for subscription-based monthly.';
COMMENT ON COLUMN public.entitlements.provider_subscription_ref IS
'Razorpay subscription_id for monthly recurring subscriptions. Null for one-time lifetime purchases.';