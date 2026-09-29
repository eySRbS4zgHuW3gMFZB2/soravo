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
