# R1-GAP-021 — Desktop Authentication: Decision Proposal

Status: **PROPOSED (NOT ACCEPTED)**
Date: 2026-10-08
Scope: R1-GAP-021 desktop authentication (system browser + PKCE + deep-link
callback + OS keychain storage + offline entitlement behavior).

This document proposes — it does not ratify — the three decisions the
authoritative pack leaves open for desktop auth. Implementation in
`crates/desktop-auth`, `apps/desktop/src-tauri`, `supabase/` and
`apps/website` follows the proposal byte-for-byte, but every `PROPOSED`
label below stays in force until a human owner explicitly accepts it. Per
`09_AI_AGENT_INSTRUCTIONS.md` stop conditions, nothing here is presented as
accepted product semantics.

Related records: ADR-011 (website email/password + PKCE), ADR-013
(devices/sessions metadata, non-secret identifiers), 05_DESKTOP_CONTRACTS.md
(entitlement cache clause), 06_WEB_CLOUD_PAYMENT.md (Supabase is the single
identity authority).

## P1 — Redirect / deep-link URI (PROPOSED)

Decision proposal: the desktop callback is the custom scheme

```text
soravo://auth/callback?code=<single-use>&state=<csrf>
```

- OS registration: `tauri-plugin-deep-link` (`init` + `on_open_url`) with
  `tauri.conf.json` → `plugins.deep-link.desktop.schemes: ["soravo"]`;
  second-instance argv entries starting with `soravo://` are routed into the
  same Rust handler via the already-configured single-instance plugin.
- The URL carries ONLY the opaque single-use code and state. Session tokens
  never transit any URL.
- Supabase Dashboard external configuration (human action, NOT EXECUTED in
  this task): add `soravo://auth/callback` to Auth → URL Configuration →
  Redirect URLs as forward-compat hardening. It is not on the critical path
  of the mint/exchange flow (no Supabase-hosted redirect is used), but it
  closes the scheme for any future provider-link step.
- Alternatives rejected: loopback HTTP listener (firewall/port-collision
  surface, second listener to harden); embedding tokens in the fragment
  (tokens in process argv/logs, no PKCE binding — violates the no-bypass
  rule in the task brief).

## P2 — Secure token storage (PROPOSED)

Decision proposal: session material persists ONLY in the OS credential
store via the `keyring` crate — service `com.soravo.desktop`, one JSON entry
(`supabase-session`: access + refresh + expiry + user id, written and wiped
atomically), device public id under `device-public-id`, non-secret
entitlement cache under `entitlement-cache`.

- Never: plaintext files, Tauri `store` JSON, `localStorage`, logs, IPC
  payloads. `TokenSet` is `zeroize`d on drop and redacted in `Debug`.
- `keyring` 4.x and `tauri-plugin-deep-link` 2.x are new dependency
  admissions (HR-4): versions resolve through `Cargo.lock`; `cargo audit`
  and `cargo deny` evidence is recorded in the task report.
- Alternatives rejected: file-based encrypted store (new key-management
  problem, invents crypto); `localStorage` (XSS-adjacent exfiltration,
  explicitly banned by the task brief).

## P3 — Offline entitlement policy (PROPOSED)

Decision proposal: a 72-hour grace window (`OFFLINE_GRACE_SECS = 259200`).

- Online fetch just succeeded → live value governs.
- Offline inside the window → honour the last verified cached value.
- Offline past the window, or never fetched → entitlement UNKNOWN; gated
  features fail closed.
- Two invariants hold regardless of the bound and are NOT provisional:
  (1) local dictation never depends on account/entitlement state (already in
  `account.rs` module docs); (2) a cached entitlement is never treated as
  fresher than its fetch time.
- Alternatives rejected: indefinite offline honour (unbounded entitlement
  drift); zero grace (single network blip locks out paying users).
- This is the smallest decision that satisfies the 05_DESKTOP_CONTRACTS.md
  "explicit offline policy" clause. Owner acceptance converts P3 into an ADR;
  until then the constant is labeled provisional in code.

## What is deliberately NOT decided here

- Supabase OAuth providers (Google/GitHub) for the desktop: unverified
  against the live project; the flow below works with the existing
  email/password login only.
- Subscription-renewal timers and server-driven revocation pushes: out of
  scope; revocation is observed on the next online entitlement fetch.
- Production redirect-allowlist entry, Edge Function deployment, and live
  Supabase credentials: external human configuration, recorded as
  NOT EXECUTED blockers in the task report.

## Flow (implements the task TECHNICAL DECISION verbatim)

```text
desktop --(1)--> system browser --> website /desktop/connect
    (existing Supabase email/password login, ADR-011)
website --(2)--> desktop-auth-mint Edge Function (user JWT reconfirmed)
    returns single-use code bound to the PKCE S256 challenge
website --(3)--> soravo://auth/callback?code=..&state=..
desktop --(4)--> desktop-auth-exchange Edge Function (code + verifier)
    PKCE verified, code atomically consumed, session minted server-side
    via Admin generateLink + /verify; tokens returned over TLS only
desktop --(5)--> OS keychain storage, session refresh, entitlement /
    device / session reads (website projections, RLS-scoped)
```
