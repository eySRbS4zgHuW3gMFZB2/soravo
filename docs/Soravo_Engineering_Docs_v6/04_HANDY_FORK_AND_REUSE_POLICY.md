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

## V1 HANDY-CORE PRESERVATION POLICY

Soravo V1 = Soravo-branded wrapper/platform around functioning Handy STT foundation.

### V1 Core Principles

1. **Handy STT behavior is FROZEN for V1** — preserve functioning baseline; no Soravo post-processing layer
2. **Soravo Modules = wrapper/business infrastructure** — accounts, Supabase, entitlements, payments, licensing, branding, release
3. **Integration Boundary = controlled interface** — typed IPC, session contracts, transcript semantics
4. **No duplicate STT stacks** — single audio/VAD/STT pipeline
5. **Handy core is the V1 behavioral baseline** — change only when required for security, platform compatibility, or explicit contract

### Do NOT Modify (V1 Preservation Rule)

Unless required for security boundary, platform/build compatibility, or explicit human approval:

- Audio capture behavior
- VAD behavior
- Transcription engine behavior
- Language detection behavior
- Transcription pipeline behavior
- Filler-word behavior
- Normalization behavior
- Punctuation behavior
- Transcript post-processing
- STT output semantics
- Hotkey behavior
- Typing/injection behavior
- Clipboard fallback behavior
- Model execution behavior

### If Tests Conflict with V1 Handy Behavior

1. Classify the conflict (test error vs implementation error)
2. STOP for product/architecture decision
3. DO NOT change Handy behavior merely to satisfy the test
4. Document the conflict in PROGRESS.md

---

## No duplicate stacks

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

## Deterministic product-direction rules

1. Soravo is a Soravo-branded fork of Handy. The Handy-derived foundation is retained and extended; the fork must not become a ground-up rewrite of Handy.
2. Prefer extending and integrating the Handy-derived foundation over rewriting equivalent local functionality from scratch, unless a documented technical, legal, security, compatibility, or product requirement requires replacement. Any replacement follows the Required procedure above and, where architecture changes, an ADR.
3. Where equivalent Handy functionality already exists and is legally and technically reusable, preserve it and integrate Soravo services around it. Do not duplicate an existing Handy subsystem merely to make it "Soravo native" (see No duplicate stacks above).

## Fork/reuse boundary and decision rule

- Handy-derived/local functionality: everything classified ADOPT/ADAPT above plus platform plumbing. It runs locally and holds no Soravo account identity, no entitlement authority, and no provider secrets.
- Soravo-owned product/service functionality: everything classified SORAVO-OWNED above. It is the sole authority for identity, entitlement, subscription, payment, and release decisions.
- Integration contracts between the two: the Soravo-owned contracts listed in `03_TECHNICAL_DESIGN.md` (session, transcript, typed IPC/events, auth/account, entitlement/offline policy, model provenance/licensing, product/release policy) and `05_DESKTOP_CONTRACTS.md`. Provider-specific logic (for example Razorpay) must not live inside the Handy-derived local core; it lives in the Soravo-owned product layer behind explicit contracts/interfaces.

Decision rule for a future AI coding agent: if a proposed change touches local capture, transcription, typing, tray, or settings behavior without involving identity, money, or cross-device state, it belongs in the Handy-derived foundation (classify per `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` as `HANDY-REUSE`, `HANDY-ADAPT`, or `HANDY-REPLACE`). If it touches Soravo accounts, sessions, entitlements, subscriptions, payments, Soravo cloud state, or release identity, it belongs in the Soravo-owned product layer (`SORAVO-OWNED` / `SORAVO-NEW`). A change crossing the fork/reuse boundary must name the integration contract it uses or extends; crossing without a contract requires an ADR.
