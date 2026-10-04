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
ADR-024 **ACCEPTED** — Narrowly scoped `unsafe` exception for Handy-derived macOS FFI (macOS builds of `soravo-desktop` only; 22 allowlisted sites). Text: `T33-P-FOLLOWUP-3D-ADR-024-MACOS-UNSAFE-EXCEPTION.md`. Owner-authorized 2026-10-02 (T33-P-FOLLOWUP-3D Decision 1) on T33-P-FOLLOWUP-3A forensics (Family U). Workspace `forbid` retained everywhere else; crate-level `deny` unchanged; Windows surfaces remain under ADR-021 only.
ADR-025 **ACCEPTED** — Restore Handy Apple Intelligence native build bridge (macOS aarch64 link repair). Text: `T33-P-FOLLOWUP-4B-ADR-025-APPLE-INTELLIGENCE-NATIVE-BUILD-BRIDGE.md`. Restores `swift/` ×3 byte-identically (SHA-256 recorded in the ADR; empty diff vs Handy `ba10ce19` AND `5ec58f69`) plus the verbatim Apple-bridge hunk in `build.rs` (macOS+aarch64-gated; no tray generator, no staging helpers, no new build-deps). Zero Rust source edits; ADR-020/021/022/023/024 unamended; x86_64 ORT remains FOLLOWUP-4.
ADR-026 **ACCEPTED** — Provision Handy-proven x86_64 macOS ONNX Runtime (Strategy A). Text: `T33-P-FOLLOWUP-4I-ADR-026-MACOS-X86_64-ORT-PROVISIONING.md`. Owner-authorized 2026-10-02 (T33-P-FOLLOWUP-4I) on T33-P-FOLLOWUP-4 forensics. Downloads Handy-proven ORT macOS x86_64 1.24.2 in CI/release (x86_64-gated only), sets `ORT_LIB_LOCATION` + `ORT_PREFER_DYNAMIC_LINK=1`, bundles `libonnxruntime.1.24.2.dylib` via the Handy `jq` frameworks mutation; observed SHA-256 pin enforced in CI. No ort upgrade/downgrade, no source build, no fork, no x86_64 removal, no ARM64 modification. Checksum independently unverified and licence/redistribution review remain open release gates. ADR-020/021/022/023/024/025 unamended.
ADR-027 **PROPOSED (NOT ACCEPTED)** — Handy transcription fixes #2156 / #2157 adoption decision. Text: `T34-D-ADR-027-HANDY-TRANSCRIPTION-SEMANTICS-2156-2157.md`. Decides nothing until a human owner explicitly approves D-2156 (drop `"ha"` from the English gated filler list) and D-2157 (capital-restoring filler removal) independently; until then Soravo remains intentionally pin-exact. Implementation authorized ONLY after that approval, strictly scoped to the approved item(s) plus their named tests.
ADR-028 **PROPOSED (NOT ACCEPTED)** — Handy Chinese-script selector #2186 adoption decision. Text: `T34-F-ADR-028-HANDY-CHINESE-SCRIPT-SELECTOR-2186.md`. Decides nothing until a human owner explicitly approves D-2186 (relocate OpenCC conversion into the transcription pipeline behind an explicit `ChineseScript` setting with migration); until then Soravo remains intentionally pre-#2186 (OpenCC-in-`actions.rs` arrangement). Implementation authorized ONLY after that approval, strictly scoped to the approved item plus its named tests. Sequencing note: #2186's `text.rs` hunk parents onto post-#2157 bytes, so ADR-027 approval/sequencing is an input.
ADR-029 **ACCEPTED (owner-directed)** — Adopt Handy transcribe-cpp 0.2.4 + per-platform backend posture. Text: `T34-H-ADR-029-HANDY-TRANSCRIBE-CPP-024.md`. Owner-authorized by the T34-H instruction ("Handy uses transcribe-cpp 0.2.4 → Soravo uses transcribe-cpp 0.2.4"), superseding the T34-G deferral. Covers the version bump, the four Handy target tables, lockfile checksums (byte-identical to Handy #2147), build.rs runtime staging + rpath, tauri linux/windows packaging maps, and CI Vulkan prerequisites. transcribe-rs, VC-redist/ORT-DLL staging, ADR-027/028 semantics, and the braces advisory are explicitly out of scope.
ADR-030 **ACCEPTED (owner-directed)** — `shadcn` is build/development tooling for the website; dev-only classification ratified. Text: `T34-O-ADR-030-SHADCN-DEV-DEPENDENCY-CLASSIFICATION.md`. Owner-authorized 2026-10-04 (T34-O: "The T34-L shadcn dependency reclassification is ACCEPTED. Keep it exactly as implemented."). Ratifies the T34-L remediation and closes the ratification gap T34-E/T34-I/T34-K left open. `shadcn` in website `devDependencies`, absent from the desktop manifest (zero desktop source references), consumed only via build-time `@import "shadcn/tailwind.css"`. Production graph excludes `braces` (`pnpm audit --prod` = 0); the residual dev-graph `braces@3.0.3` HIGH (`GHSA-vfj7-8cjw-p6xm`) is **ACCEPTED and documented** — no upstream `braces@3.0.4` exists (registry 404) and `shadcn@4.21.1` still pulls `fast-glob`. No suppression, override, fabricated version, `.npmrc` or CI weakening; the T34-N-restored lockfile is retained (12 changed dependency lines total — 4 insertions, 8 deletions — all `shadcn`); pre-existing `undici` ×2 via `wrangler > miniflare` untouched. The floating `"latest"` specifier churn class is explicitly **deferred** to its own ADR. Governance closure only — authorizes no merge and no release claim.

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
ADR-031 **ACCEPTED (owner-directed)** — Owner merge policy: the repository owner/primary maintainer may merge their own pull request when, and only when, every required automated check and repository-defined safety gate passes. Text: `T34-P-ADR-031-OWNER-MERGE-POLICY.md`. Owner-authorized 2026-10-04 by direct owner instruction. Supersedes nothing and amends nothing; the prior "second human approval on every PR" requirement existed **only** in GitHub branch protection (`required_approving_review_count: 1`, set by T23) plus historical task-report/`PROGRESS.md` logs — no canonical pack document ever mandated it. GitHub change is exactly one field, `required_approving_review_count: 1 → 0`; required status checks (`web`, `e2e`, `rust`, `desktop`), `strict`, `dismiss_stale_reviews`, force-push/deletion blocks and `enforce_admins` are all unchanged. Not weakened: required CI, security/audit checks, no force-push or history rewriting, no disabling required checks to obtain a merge, no merge with failing required checks, no fabricated or self-created review approval, no use of GitHub emergency "bypass rules"/admin override to work around a failing requirement. Security-sensitive and explicitly designated changes still require independent human review by a non-author and the agent must stop rather than merge; recorded limitation: GitHub branch protection cannot express a conditional review requirement, so that carve-out is procedural/agent-enforced, and the owner must grant a non-author reviewer access before such a change is authored. Production/release gates remain separate and unsatisfied by any merge. Governance text only — no CI job, workflow, secret, dependency or PR #64 change.
**Amended by ADR-031-A1 (T34-R, 2026-10-04):** the designated-review carve-out is **prospective only** — it applies solely to PRs opened on or after `2026-10-04T00:00:00Z` and is not retroactive; the §4 non-weakening clause is not date-bounded and applies to every merge. Added an **anti-deadlock rule**: the carve-out may not be used to create a cycle where PR A is required to restore green CI on `main`, PR B is required to permit A to merge, and B cannot go green until A merges — where that cycle would form, the older pre-existing remediation PR merges first by the ordinary path with all required checks green, never via disabled protection, bypass, or "merge without waiting for requirements to be met". Added a **named exception: PR #64** (`fix/t34-l-braces-dependency-remediation`, head `1cf65c02e5763fc80ab93d990bb9cf3a4d7ff351`, opened `2026-10-03T10:47:11Z`) is owner-mergeable and outside the carve-out, on four recorded grounds: it predates ADR-031; it remediates the pre-existing red `main` (`CI` `36339104443` and `Security Audit` `37173073676` both failing at `ede495b5`); its required CI and security checks are green (`CI` `37179463666`, `Security Audit` `37179463669`); and its merge is required to restore the repository's CI signal. It must be merged ordinarily — not reconstructed, duplicated, rebased, cherry-picked, force-pushed, or merged with any failing or unverified check. **Not a precedent:** every dependency-, CI/workflow-, security- and release-sensitive PR authored on or after `2026-10-04T00:00:00Z` stays fully subject to the carve-out without exception; no required check, branch-protection field, or non-weakening clause was lowered; no bypass, admin override, or fabricated approval is authorized; PR #65 (the governance PR itself, opened `2026-10-04T07:26:40Z`) remains fully subject to the carve-out and to independent review.

Create/update an ADR when:
- architecture changes;
- a Handy subsystem is replaced;
- duplicate implementations are retained;
- payment/provider semantics change;
- security boundaries change;
- auth/storage architecture changes;
- release architecture changes;
- major dependency strategy changes.
