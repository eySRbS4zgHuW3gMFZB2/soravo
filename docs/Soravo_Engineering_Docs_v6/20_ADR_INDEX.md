# 20 — ADR Index

**This file is the single index of record for Soravo ADRs.** A byte-divergent
copy of this file exists at the repository root
(`Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`); that copy is a **non-authoritative
mirror** and carries a pointer here instead of its own current entries. If the
two ever disagree, this file wins.

ADR text is not stored in this pack. Accepted ADR text lives at the repository
root, named `T32-<task>-ADR-<number>-<slug>.md`, and is referenced from here.

ADR-001 Local-first STT.
ADR-002 Tauri v2.
ADR-003 Supabase Auth/Postgres/RLS.
ADR-004 Razorpay.
ADR-005 Shared `@soravo/payment-domain`.
ADR-006 Handy-derived desktop foundation.
ADR-007 Soravo-owned session contract.
ADR-008 Soravo-owned transcript semantics.
ADR-009 No duplicate desktop stacks.
ADR-010 UI overhaul deferred until functional/release gates.
ADR-011 Model licensing gate.
ADR-012 Monthly cancellation semantics.
ADR-013 Durable Razorpay webhook idempotency.
ADR-014 Cloudflare Pages as established website hosting.
ADR-015 TestSprite as supplemental QA.
ADR-016 Documentation authority: GitHub implementation truth + this pack intent/control truth.
ADR-018 V1 Handy-core preservation policy.
ADR-019 **ACCEPTED (with recorded amendments)** — Handy V1 runtime restoration (minimum integration boot). Text: `T32-Y-ADR-019-HANDY-V1-RUNTIME-RESTORATION-ACCEPTED.md`. Shipped on PR #63 in `5649411d` and `27200173`. Decides `D-CATALOG = B` (schema tolerance only; `catalog.json` stays authoritative and unpopulated) and ratifies the `paste_tx/` restoration as restoration of existing source. Outstanding obligations recorded in the ADR: T1 boot gate, T2 macOS/Windows build jobs, `app.tsx` truthfulness. macOS/Windows compilation is `UNKNOWN`; only `x86_64-unknown-linux-gnu` was compiled and launched. **ADR-019 is the only current entry for this decision.**
ADR-020 **ACCEPTED** — Windows `windows`-crate dependency alignment (0.54 bare → 0.61.3 + Handy-proven 11 features, zero source edits). Text: `T33-P-FOLLOWUP-2B-ADR-020-WINDOWS-DEPENDENCY-ALIGNMENT.md`. Owner-authorized 2026-10-01 (T33-P-FOLLOWUP-2B Decisions 1, 2, 4, 5) on T33-P-FOLLOWUP-2A forensics (Families A+B). `winreg` pinned at 0.10; `webview2-com` not adopted; macOS/`yoke-derive` explicitly out of scope.
ADR-021 **ACCEPTED** — Narrowly scoped `unsafe` exception for Handy-derived Win32 FFI (Windows builds of `soravo-desktop` only; 21 allowlisted sites). Text: `T33-P-FOLLOWUP-2B-ADR-021-WINDOWS-UNSAFE-EXCEPTION.md`. Owner-authorized 2026-10-01 (T33-P-FOLLOWUP-2B Decision 3) on T33-P-FOLLOWUP-2A forensics (Family C). Workspace `forbid` retained everywhere else; macOS `unsafe` surfaces explicitly NOT covered (FOLLOWUP-3/-4 own them).
ADR-022 **ACCEPTED** — macOS minimum supported version 10.15 (Tauri `minimumSystemVersion` floor for the aarch64 ggml build). Text: `T33-P-FOLLOWUP-3-ADR-022-MACOS-DEPLOYMENT-FLOOR.md`. Owner-authorized 2026-10-01 (T33-P-FOLLOWUP-3 project decision) on T33-P-FOLLOWUP-1 §B forensics. Config-only (`tauri.conf.json` one key); x86_64 `ort-sys` strategy, Windows code, Handy behavior, and signing/release explicitly out of scope.
ADR-023 **ACCEPTED** — Windows `windows`-crate realignment 0.61.3 → 0.62.2 (Family D HWND type-split repair, Path A; zero source edits). Text: `T33-P-FOLLOWUP-2D-ADR-023-WINDOWS-062-ALIGNMENT.md`. Owner-authorized 2026-10-01 (T33-P-FOLLOWUP-2D-DECISION Path A) on T33-P-FOLLOWUP-2D forensics. Supersedes ADR-020 Decision 1 (0.61.3 pin; all other ADR-020 decisions stand) and records the ADR-021 re-review (21-site allowlist unchanged; `windows-version` pin reference updated to 0.62.2). `winreg` pinned at 0.10; `webview2-com` not adopted; any new Windows error class is STOP, not repaired inline.

### Provenance correction note (documentary — not an ADR)

Recorded by T33-I. **This note creates, accepts, amends, or ratifies nothing.**
No ADR text was created, accepted, amended, or rejected. No trigger in
*Create/update an ADR when* below fires, and no entry above or below this note
changed status. ADR-019 remains accepted on exactly the terms already recorded,
and `D-CATALOG = B` remains in force.

What changed is the **provenance record only**:

- The upstream Handy source identity is now resolved and recorded as
  `https://github.com/cjpais/Handy` @ `ba10ce1943ef34e93c09494027fc0b9ced2e8a44`
  (pin of record), with upstream origin and exact bytes established by blob
  identity. See `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`, which previously recorded
  upstream identity as `UNKNOWN`. That earlier state is `HISTORICAL/STALE`.
  Blob identity establishes upstream origin and byte content; it does not
  uniquely select a single upstream commit, and `21` records that limitation
  explicitly.
- A `RESTORE-NOT-REFORK` recovery rule was recorded in
  `04_HANDY_FORK_AND_REUSE_POLICY.md` and `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`.
  It is a **process control**, not an architecture decision. It narrows the
  default action for a traced, bounded, byte-recoverable omission and it does
  not authorize any code, test, catalog, dependency, CI, or release change.
- The owner decisions previously recorded as open are **unchanged and still
  open** — the transcription-test treatment and the per-model catalog data and
  licensing checklist. The provenance correction supplies evidence for those
  decisions; it does not make them. It also does not overturn ADR-019's
  `D-CATALOG = B`, which remains the governing position.
- No ADR was required for this correction because a process control is not an
  architecture decision. T32-Y set the same precedent for a control-plane
  change.

## Numbering note

`ADR-017` is absent from this sequence. ADR numbers in the v2 sequence
(`10_ADR_INDEX.md` at the repository root — `ADR-019` there is *update/release
mechanism*) and in `docs/archive/spec-v3/decisions/` (`ADR-027` is
*handy-derived-desktop-foundation*) are **different sequences**. This pack's
sequence governs. `ADR-019` above is unambiguously the Handy V1 runtime
restoration ADR and **not** the v2 update/release-mechanism ADR.

Create/update an ADR when:
- architecture changes;
- a Handy subsystem is replaced;
- duplicate implementations are retained;
- payment/provider semantics change;
- security boundaries change;
- auth/storage architecture changes;
- release architecture changes;
- major dependency strategy changes.
