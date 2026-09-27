# 04 — Handy Fork / Derive / Rebrand Policy

## Product decision

Soravo uses Handy as a desktop implementation foundation and derives/adapts it
into a Soravo-owned product.

Handy is not a requirements authority.

Soravo owns:

- product requirements;
- session and transcript semantics;
- IPC contracts;
- privacy/security;
- account/auth;
- Supabase;
- entitlements;
- Razorpay;
- model provenance/licensing;
- branding;
- release policy.

## Required procedure for every desktop subsystem

1. locate the Soravo implementation;
2. locate the Handy-derived equivalent;
3. inspect actual source, not filenames alone;
4. identify exact upstream/source provenance;
5. classify ownership;
6. reuse/adapt only where compatible;
7. implement the smallest Soravo-specific delta;
8. run targeted tests;
9. run affected integration tests;
10. document reuse/non-reuse;
11. update source chain-of-custody if Handy code was touched.

## Default classification

### ADOPT/ADAPT

- Tauri shell;
- React foundation;
- audio capture/toolkit;
- VAD;
- hotkeys;
- typing/input;
- clipboard;
- settings;
- tray;
- overlay;
- model management;
- transcription infrastructure;
- history;
- platform plumbing.

### SORAVO-OWNED

- session state machine;
- transcript semantics;
- typed IPC contracts;
- authentication;
- Supabase;
- entitlements;
- payment;
- model licensing/provenance;
- product decisions;
- branding;
- release policy.

### REPLACE

User-facing Handy branding, copy, logos, product identity, or behavior that
conflicts with Soravo contracts.

## No duplicate stacks

Do not create parallel implementations for the same desktop responsibility.

If a compatible Handy-derived implementation exists:

- migrate consumers;
- verify behavior;
- delete redundant implementation;
- document the decision.

Keeping both requires an ADR.

## Upstream synchronization

No automatic Handy synchronization is allowed.

An upstream update requires:

- old/new pinned SHAs;
- source diff;
- dependency diff;
- license review;
- Soravo contract review;
- regression tests;
- platform validation;
- explicit PR/ADR.

See `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`.

## Release gate

Unknown Handy provenance or unresolved model licensing is not silently waived.
The affected release claim is `BLOCKED` or `UNKNOWN` until evidence exists.
