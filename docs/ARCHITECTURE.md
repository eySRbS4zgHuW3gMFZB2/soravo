# Soravo architecture map

This repository begins with the boundaries prescribed by the technical design:

- `apps/website`: public product website; it contains no account secrets or dictation data.
- `apps/desktop`: React presentation shell and Tauri v2 Rust runtime.
- `crates/transcript`: ordered session-update contract; it does not inject text.
- `crates/config`: validated configuration value objects; persistence is deliberately deferred.
- `services/license-api`: server-side payment boundary (`@soravo/license-api`); owns the `createOrder` surface, the product catalog, and the provider abstraction. CLOUD-009 delivers the skeleton (server price authority, no live Razorpay/entitlement writes). Real Razorpay integration is reserved for CLOUD-010/CLOUD-011; entitlement writes use `service_role` per ADR-012.
- `supabase`: reserved for committed migrations and Edge Functions, after a project is explicitly selected.

No audio, STT, hotkey, clipboard, account, or payment capability is mocked as complete. Those features must be built in their respective phase with the associated QA gates.
