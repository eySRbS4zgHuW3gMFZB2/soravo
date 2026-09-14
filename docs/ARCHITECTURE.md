# Soravo architecture map

This repository begins with the boundaries prescribed by the technical design:

- `apps/website`: public product website; it contains no account secrets or dictation data.
- `apps/desktop`: React presentation shell and Tauri v2 Rust runtime.
- `crates/transcript`: ordered session-update contract; it does not inject text.
- `crates/config`: validated configuration value objects; persistence is deliberately deferred.
- `services/license-api`: reserved for the server-side Razorpay verification boundary.
- `supabase`: reserved for committed migrations and Edge Functions, after a project is explicitly selected.

No audio, STT, hotkey, clipboard, account, or payment capability is mocked as complete. Those features must be built in their respective phase with the associated QA gates.
