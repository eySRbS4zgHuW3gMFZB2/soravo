# T33-P-FOLLOWUP-2B — WINDOWS DEPENDENCY ALIGNMENT (IMPLEMENTATION REPORT)

**Task:** T33-P-FOLLOWUP-2B — implement owner Decisions 1–5 on the
T33-P-FOLLOWUP-2A forensics: align the `windows` crate with the
Handy-compatible declaration/version + features (Families A+B), permit a
narrowly scoped unsafe exception for the Handy-derived Win32 FFI (Family
C), record ADR-020 + ADR-021, validate locally, push, and classify
authoritative GitHub CI.
**Date:** 2026-10-01 (UTC).
**Branch:** `t31/soravo-wrapper-completion`.
**Start HEAD:** `a9602ea2b4ef2b0e4006a8d1d5dce16a5791faf5` (== origin).
**End HEAD:** `42fa7c31adccb59ed497a18bfc0f20af3179ac9f` (pushed, ==
origin, 0 ahead / 0 behind).
**PR #63:** OPEN, head `42fa7c31`, `MERGEABLE` / `BLOCKED` /
`REVIEW_REQUIRED` (0 of 1), `mergedAt: null`. NOT MERGED.
**Verdict:** Decisions 1–5 implemented exactly as authorized. Families A
(10 × E0432), B (3 × E0308 + 1 × E0432 + latent B5), and C (21 ×
unsafe-forbid) are ALL GONE on authoritative CI (35 → 2 errors). The
repair exposed ONE distinct defect beyond Families A–C — **Family D**:
`windows` 0.61.3 vs 0.62.2 `HWND` type duplication via
`tao 0.37.1 → tauri 2.12.0` (2 × E0308, `overlay.rs:165,365` only). Per
the task STOP rule it is RECORDED here as the next deterministic task and
NOT repaired (every repair path needs an owner decision and/or a
forbidden edit). No macOS / yoke-derive / catalog / UI / release change.
No test created, modified, or masked. Windows success is NOT claimed.

---

## 0. Reading-gate record (in order, this session)

| # | Item | Result |
|---|---|---|
| 1 | Canonical `docs/Soravo_Engineering_Docs_v6/SPEC_MANIFEST.json` | read — v6.0.0, 24 entries, read order 1–24 |
| 2 | Canonical pack in read order, in full | read: `00_README.md` (gate order) · `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` · `02_PRODUCT_REQUIREMENTS.md` · `03_TECHNICAL_DESIGN.md` · `04_HANDY_FORK_AND_REUSE_POLICY.md` (V1 preservation + RESTORE-NOT-REFORK + boundary rule) · `05_DESKTOP_CONTRACTS.md` · `06_WEB_CLOUD_PAYMENT.md` · `07_IMPLEMENTATION_PLAN.md` (dependency rule) · `08_TASK_BREAKDOWN.md` · `09_AI_AGENT_INSTRUCTIONS.md` (discipline, reading gate, skill gate, stop conditions, duty when stopped) · `10_AI_SKILLS.md` (registry of record + gate steps + matrix) · `11_MCP_AND_AGENT_TOOLING.md` · `12_SECURITY_BASELINE.md` (:14 unsafe-ADR rule) · `13_DEFINITION_OF_DONE_AND_QA.md` · `14_CI_CD_AND_BRANCHING.md` (A–F classes) · `15_ENVIRONMENT_AND_SECRETS.md` · `16_TEST_AND_BENCHMARK_PROTOCOL.md` · `17_RELEASE_RUNBOOK.md` · `18_INTERRUPTION_AND_HANDOFF.md` · `19_STATE_AUDIT_PROTOCOL.md` · `20_ADR_INDEX.md` (index of record; ADR-017 absent; next free 020/021) · `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` (full, 322 L — pin `ba10ce19`, recovered boundary) · `DESIGN.md` (full, 544 L) |
| 2b | Root `SPEC_MANIFEST.json` + all 14 root-manifest documents | read in full (HISTORICAL/STALE pending O-5; traceability only, never override): `README.md` · `01_PRD.md` · `02_TDD.md` · `03_AI_INSTRUCTIONS.md` (§5 gate + §9 Handy Reuse First) · `04_IMPLEMENTATION_PLAN.md` · `05_TASK_BREAKDOWN.md` · `06_DOD_QA.md` (§16 Handy reuse gate) · `07_AI_SKILLS.md` (matrix + inventory) · `08_MCP_AND_AGENT_TOOLING.md` · `09_SECURITY_BASELINE.md` · `10_ADR_INDEX.md` (v2 sequence — different sequence, noted) · `11_INTERRUPTION_HANDOFF.md` · `12_BENCHMARK_PROTOCOL.md` · `13_RELEASE_RUNBOOK.md` · `14_ENVIRONMENT_AND_SECRETS.md` |
| 3 | `PROGRESS.md` | read head (L1–120) + full T33-PRE→2A tails (L5537–6137) first-hand; middle carried as HISTORICAL evidence (not load-bearing for this dependency task) |
| 4 | Fresh Git / branch / PR #63 / CI state | performed this session — HEAD `a9602ea2` == origin, 0/0; only `M PROGRESS.md` (prior-task entries, preserved); PR #63 OPEN/BLOCKED/REVIEW_REQUIRED, NOT MERGED |
| 5 | `T33-P-FOLLOWUP-2A-WINDOWS-DESKTOP-MIGRATION-FORENSICS.md` | read in full (358 L); every load-bearing claim re-derived below, none assumed |
| 6 | `T33-P-FOLLOWUP-2-WINDOWS-CLIPBOARD-REMEDIATION-REPORT.md` | read in full (378 L) |
| 7 | `T33-P-FOLLOWUP-1-CROSS-PLATFORM-FORENSICS.md` | read head (L1–50; §§C mechanism carried via 2A re-derivation) |
| 8 | `T05-B-MEMORY-ADR-DECISION-PACK.md` (full, 259 L) + `T04-B-MEMORY-UNSAFE-FFI-REPORT.md` (full, 145 L) | unsafe-policy mechanics (§8 lint options, §12 approval shape, forbid-vs-deny semantics) |
| 9 | `.github/workflows/ci.yml` (full, 166 L) | CI families, `-D warnings` clippy gate, lockfile-unchanged assertion, T2 Windows/macOS legs |
| 10 | `decisions/ADR-026-handy-foundation.md` + `decisions/README.md` + root `10_ADR_INDEX.md` | ADR template + v2-sequence numbering (different sequence from the v6 pack, per the pack's numbering note) |
| 11 | Skill Selection Gate | executed BEFORE planning/editing — §1 |

## 1. Skill Selection

- Task classification: repository/Git operations (APPLICABLE) · Rust — dependency declaration + compile-error repair (APPLICABLE) · Rust security review / hardening — unsafe-policy exception (APPLICABLE) · Tauri — desktop build config (APPLICABLE) · Tauri toolchain/prerequisites — Windows target (APPLICABLE) · GitHub + CI/CD — commit/push/PR/CI evidence (APPLICABLE) · documentation/specification/ADR — 2 ADRs + report (APPLICABLE) · interruption/handoff/state audit — fresh audit (APPLICABLE) · licensing/provenance + supply chain — windows version bump (APPLICABLE) · Handy upstream analysis — pinned-source comparison (APPLICABLE) · security-general — unsafe boundary, Win32 FFI, no-clipboard-telemetry (APPLICABLE) · securability-engineering — policy-adjacent change (APPLICABLE). Inspected and found NOT applicable: TypeScript/React/shadcn, frontend/UI, accessibility, backend/API, database/Supabase, authentication, payments, Cloudflare/deployment-execution, packaging/release-execution (must not touch `release.yml`), MCP/tooling config, discovery, testing-skill execution (no test created/modified — `vitest`/`playwright` deliberately not selected), smart-contract workflow. Speech/audio/STT contracts: no skill installed — v6 §§03/05/16 govern; recorded, not invented. Benchmarking: no skill installed — recorded, not invented.
- Mandatory skills selected (all actually loaded via `skill` tool BEFORE planning/editing): `rust-engineer` (full content — declaration change + validation commands) · `rust-review` (412-line content — review of existing Windows/FFI code; no new unsafe authored) · `gh-cli` (full content — authenticated `gh` PR/CI evidence + push) · `tauri` (full index — v2 build/config correctness) · `tauri-setup` (full content — platform toolchain/prerequisites) · `security-guidance` (index + workflow — unsafe-policy boundary; no new trust boundary/secret/endpoint/IPC surface, so no further ASVS file triggered; governing rules v6 `12` + root `09` §18 no-clipboard-logging, both preserved) · `securability-engineering` (secure-by-default wrapper — the lint change is configuration-only, no generated code path) · `supply-chain-risk-auditor` (full content — dependency-judgment guidance; its collectors cover npm/PyPI/Go only, NOT Cargo — version facts below come from `Cargo.lock` + `cargo tree` + vendored registry sources + CI logs instead, substitution recorded here as in 2A §1).
- Declined with reason: `github` (overlaps `gh-cli`, the registry default) · `tauri-development` (no feature development) · `vitest`/`playwright` (no test created/modified) · all frontend (`shadcn`, `react`, `vercel-*`, `frontend-design`, `frontend-accessibility`, `web-design-guidelines`) · all `supabase*` · all `cloudflare*`/`wrangler`/`web-perf` · `agent-security-audit`/`mcp-server-review` (no agent/MCP config change) · `semgrep`/`codeql` (CLIs absent on host — `which` verified; no SAST claim made) · `secure-workflow-guide` (smart-contract workflow — not applicable) · `find-skills` (no uncovered domain).
- MCP/tools selected: `read` (file evidence) · `bash` for `git`/`gh`/`cargo`/`grep` only · `edit`/`write` (scoped implementation + ADRs). Zero MCP tools called. `supabase`/`cloudflare`/`testsprite` MCPs deliberately not selected (no DB/cloud/test-service action needed).
- Authority/source boundary: repository facts from the worktree + `~/.cargo` vendored registry; upstream facts from curl-fetched Handy bytes at pin `ba10ce19` (first-hand this session) + `gh` API; no chat-history/memory/prior-report conclusion used for any load-bearing fact (2A's bytes re-verified: upstream stanza re-fetched, feature names re-checked against vendored `windows-0.61.3`, blame/census re-derived).
- Conflicts found: none.
- Result: CLEAR — proceed to implementation.
- Scope-change re-evaluation: Family D exposure introduced no new domain (same Rust/Windows/CI lanes); no additional skill required. Recorded, gate not re-run.

## 2. Owner decisions → implementation mapping

| Owner decision | Implementation | Evidence |
|---|---|---|
| 1 — align with Handy-compatible declaration/version + features | `windows = { version = "0.61.3", features = [<11 exactly as upstream>] }`; `Cargo.lock` edge `windows 0.54.0` → `windows 0.61.3` (one line) | commit `83a49672` + ADR-020 |
| 2 — preserve Handy V1 behavior/logic; no redesign for 0.54 | zero source edits to the 4 implementation files (byte-unchanged, verified by diff) | `git status` + §6 |
| 3 — narrow unsafe exception, not global weakening | root `forbid` UNCHANGED; crate-level `deny` + four `target_os="windows"`-gated `allow`s on Soravo-owned `lib.rs` module declarations | commit `42fa7c31` + ADR-021 |
| 4 — do not modify winreg 0.10 | `winreg = "0.10"` untouched; lockfile `winreg 0.10.1` untouched | diff |
| 5 — keep separate from macOS and yoke-derive | macOS sources/legs + `yoke-derive` untouched; macOS `unsafe` explicitly NOT covered (still denied) | diff + CI §7 |

## 3. Handy reuse audit (mandatory — Handy-derived subsystem touched)

- Handy source inspected (pinned tree `ba10ce19`, first-hand this session): upstream `src-tauri/Cargo.toml` `[target.'cfg(windows)'.dependencies]` stanza (fetched via curl to `/tmp/opencode/handy-cargo.toml`: `webview2-com = "0.38"` + comment, `windows 0.61.3 + 11 features` verbatim, `winreg = "0.55"`); absence of any `[lints]` section (grep-verified); edition 2021. 2A's file-level byte-identity (all 4 implementation files) carried as evidence — this task made zero source edits, so no new byte comparison was required or performed.
- Exact files/modules/functions reused: the upstream `windows` declaration — version `0.61.3` + all 11 feature strings copied verbatim in upstream order (configuration reuse, not code).
- Adaptations made: (a) `winreg` deliberately NOT adopted at upstream `0.55` — kept at `0.10` per owner Decision 4 (zero errors attributable; verified APIs present in vendored `winreg-0.10.1`); (b) `webview2-com 0.38` deliberately NOT adopted — no reported error references it (no-new-dependency discipline); (c) the unsafe-exception mechanism is Soravo-side glue (upstream has no lint policy to reuse) — crate `deny` + 4 cfg-gated `allow`s in Soravo-owned `lib.rs`.
- Functionality implemented from scratch: ADR-020/ADR-021 text, the `lib.rs` attributes + crate `[lints.rust]` table, index entries, this report. No Handy behavior implemented from scratch (nothing was rewritten).
- Reason for non-reuse: the lint-policy layer has no Handy counterpart (upstream ships no `[lints]`); the policy exception is therefore `SORAVO-OWNED` glue around `HANDY-REUSE` code. Classification of the touched subsystem: `HANDY-REUSE` (implementation bytes) + `SORAVO-OWNED` (dependency/policy configuration).

## 4. Exact changes (two commits — not bundled, per 2A §5/§14 governance lanes)

Commit 1 — `83a49672` (ADR-020 vehicle: dependency declaration):
`apps/desktop/src-tauri/Cargo.toml` (`windows = "0.54"` → `0.61.3` + 11
features, with rationale comment; `winreg` untouched) + `Cargo.lock`
(one-line direct edge) + `T33-P-FOLLOWUP-2B-ADR-020-WINDOWS-DEPENDENCY-ALIGNMENT.md`
(new) + `20_ADR_INDEX.md` (ADR-020 entry).

Commit 2 — `42fa7c31` (ADR-021 vehicle: lint policy):
`apps/desktop/src-tauri/Cargo.toml` (`[lints] workspace = true` →
explicit `[lints.rust]` with `unsafe_code = "deny"` +
`unused_must_use = "deny"`, with rationale comment) +
`apps/desktop/src-tauri/src/lib.rs` (four
`#[cfg_attr(target_os = "windows", allow(unsafe_code))]` attributes on
`overlay` / `paste_tx` / `utils` / `managers`, with rationale comments) +
`T33-P-FOLLOWUP-2B-ADR-021-WINDOWS-UNSAFE-EXCEPTION.md` (new) +
`20_ADR_INDEX.md` (ADR-021 entry).

ADR numbering governance: v6 pack sequence governs (pack numbering note);
the v6 index of record listed up to ADR-019 with ADR-017 absent (not
reused — status unknown, collision risk). ADR-020/021 are the next free
identifiers; nothing was overwritten. Root `10_ADR_INDEX.md` (v2
sequence) and `decisions/` untouched — different sequence, explicitly
disambiguated in both ADR files. Root mirror `20_ADR_INDEX.md` untouched
(pointer only, per mirror policy).

## 5. Supply-chain record (substitution for out-of-scope collector)

- `windows 0.61.3` checksum `9babd3a7…` — already present pre-change via
  `tauri-plugin-opener 2.6.0`; no new crate version entered the graph
  (lockfile diff: exactly one edge line). `windows 0.54.0` correctly
  remains via the `cpal → rodio` audio path (transitive, untouched).
- 11/11 feature names verified present in vendored
  `windows-0.61.3/Cargo.toml` before declaration.
- `cargo deny check`: ok (advisories/bans/licenses/sources). `cargo
  audit`: only the pre-existing `yoke-derive 0.8.3` yanked denial —
  byte-identical cause to baseline, owned by the separate yanked-advisory
  task, NOT fixed here (Decision 5 separation).

## 6. Diff hygiene (before commit — verified, both commits)

- Commit 1: 4 files (manifest hunk, lockfile edge, ADR-020, index line).
  Commit 2: 4 files (manifest lints hunk, `lib.rs` attributes, ADR-021,
  index line). `git diff --check` clean on both.
- Byte-unchanged, verified: `paste_tx/windows.rs`, `utils.rs`,
  `overlay.rs`, `managers/audio.rs` (the DO-NOT list); all macOS sources;
  `yoke-derive` pin; catalog/model assets; UI; release/signing
  (`release.yml` untouched, never dispatched); all tests; all other
  workspace manifests (`clipboard-win`, `winapi` untouched); root
  `Cargo.toml` workspace `forbid` (unchanged).
- Unsafe census: zero new `unsafe` constructs (`unsafe {` / `unsafe fn` /
  `unsafe extern` / `unsafe trait|impl`) introduced anywhere. Substring
  census adds only the four `allow(unsafe_code)` lint attributes + their
  rationale comments in `lib.rs`. Pre-existing macOS-gated `unsafe`
  (`input.rs`, `autostart.rs`, `apple_intelligence.rs`,
  `secure_input.rs`, `paste_tx/macos.rs`) byte-untouched and still
  deny-blocked on their own targets.

## 7. Validation results (all first-hand, this session)

| Gate | Command | Result |
|---|---|---|
| Format | `cargo fmt --check -p soravo-desktop` | PASS (exit 0) |
| Diff hygiene | `git diff --check` (both commits) | PASS |
| Linux clippy | `cargo clippy -p soravo-desktop --all-targets -- -D warnings` | PASS, zero warnings |
| Linux tests | `cargo test -p soravo-desktop` | PASS — 256 passed / 0 failed (matches T33-O baseline; no regression) |
| Resolution | `cargo tree --target x86_64-pc-windows-msvc -i windows@0.61.3` | `soravo-desktop` direct edge confirmed; no new crate version |
| Supply chain | `cargo deny check` | PASS (all four checks ok) |
| Supply chain | `cargo audit` (CI's exact ignore list) | only pre-existing `yoke-derive 0.8.3` yanked denial — unchanged, out of scope |
| Windows-target check (local) | `cargo check -p soravo-desktop --target x86_64-pc-windows-msvc` | HOST-LIMITED: fails at `ring` build script (`failed to find tool "lib.exe"`, exit 101) before reaching `soravo-desktop` — log has ZERO `soravo-desktop` frames and ZERO E0432/E0308/unsafe errors. No Windows success claimed locally; CI is the sole proof surface (as in 2A §4) |
| No-clipboard-telemetry | touched scope logs nothing (config-only change) | holds (v6 `12` / root `09` §18) |

## 8. Authoritative CI proof (GitHub, not local reasoning)

Push `a9602ea2..42fa7c31` → CI run `36807093893` (`completed`/`failure`)
+ Security Audit `36807093919` (`completed`/`failure`).

| Job | Conclusion | Classification |
|---|---|---|
| `web` / `e2e` / `desktop` (Linux) | success ×3 | unchanged-or-better ✓ |
| `rust` (job `110193759209`) | failure | SOLELY the pre-existing `yoke-derive 0.8.3` yanked `cargo audit` denial (log-verified; failure at the audit step — `fmt`/`clippy`/`test` all passed on CI, confirming the lint change is Linux-clean). Byte-identical cause to baseline run `36798675037`; owned by the yanked-advisory task |
| `cargo-audit` / `cargo-deny` / `npm-audit` | failure / success / success | unchanged (yanked only) ✓ |
| `desktop-macos x86_64` (`110193759114`) | failure | UNCHANGED — `ort-sys@2.0.0-rc.12: ort does not provide prebuilt binaries for x86_64-apple-darwin` (verbatim baseline; FOLLOWUP-4) |
| `desktop-macos aarch64` (`110193759040`) | failure | UNCHANGED — bundled ggml `'path' is unavailable: macOS 10.15+` (verbatim baseline; FOLLOWUP-3) |
| `desktop-windows` (`110193759211`) | failure — **35 → 2 errors** | Families A+B+C REMEDIATED (see below); remainder is the NEW Family D — STOP, §9 |

Windows-leg evidence (`--log-failed`, 1,200 lines, ANSI-stripped):
- **0 × E0432** (was 11: 10 Family-A + B1). All feature-gated imports
  resolve — ADR-020 proven for Family A AND the `core::BOOL` import.
- **0 × unsafe-forbid errors** (was 21). The cfg-gated exception works —
  ADR-021 proven for Family C.
- **0 × `paste_tx` errors of any kind**, including explicit silence at
  `paste_tx/windows.rs:388` (latent B5) — Family B `HANDLE`/`HGLOBAL`
  construction proven fixed, latent site included.
- `soravo-typing` / `clipboard-win`: still clean (FOLLOWUP-2 holds).
- Remaining: exactly 2 × E0308, both the same new mechanism (§9).

## 9. STOP — Family D: `windows` 0.61.3 vs 0.62.2 `HWND` duplication (NOT fixed, NOT started)

Clearing Families A–C exposed one distinct defect beyond Families A–C,
masked until now because the E0432 cascade on the `SetWindowPos` import
itself hid the argument-type check:

```text
error[E0308]: mismatched types
    --> apps\desktop\src-tauri\src\overlay.rs:165:21
     |  expected `HWND`, found `windows::Win32::Foundation::HWND`
note: there are multiple different versions of crate `windows` in the dependency graph
    --> windows-0.61.3 .../Foundation/mod.rs:5670 (expected)
    ::: windows-0.62.2 .../Foundation/mod.rs:5670 (found)
```

(second error identical at `overlay.rs:365:13`.)

- Mechanism: `overlay_clone.hwnd()` returns Tauri's `HWND`, whose type
  comes from `windows 0.62.2` — pulled by `tao v0.37.1` via
  `tauri-runtime-wry v2.12.0` → `tauri v2.12.0` (verified first-hand:
  `cargo tree --target x86_64-pc-windows-msvc -i windows@0.62.2`).
  Our `SetWindowPos` resolves to `windows 0.61.3` (ADR-020). Same struct
  layout (`HWND(pub *mut c_void)`), different crate versions → different
  Rust types → E0308. A dependency-version *duplication* conflict, not a
  feature gate (A), not a 0.54-vs-0.61 API migration (B), not a lint
  policy (C).
- Why Handy never saw it: Handy's pin-era `tauri`/`tao` resolved a
  `windows` version identical to its declared 0.61.x; Soravo's current
  `tauri 2.12.0` / `tao 0.37.1` pulls 0.62.2. The duplication arrived
  with Soravo's newer Tauri closure, not with the Handy restore.
- Candidate repairs (all out of scope — recorded, none attempted):
  (a) bump our declaration to 0.62.2 — contradicts owner Decision 1
  (Handy-proven 0.61.3) and re-opens Family B assumptions proven only on
  0.61.x; needs owner re-decision + ADR-020 amendment;
  (b) convert `HWND` at the two call sites (e.g. reconstruct from the
  raw pointer) — edits `overlay.rs`, which the owner explicitly forbade
  (`DO NOT rewrite overlay.rs`) and which Decision 2 protects;
  (c) downgrade `tao`/`tauri`'s `windows` edge — dependency surgery
  across subsystem boundaries (v6 `09` stop condition), unproven blast
  radius (all Tauri plugins share the closure).
- Smallest deterministic next task: **T33-P-FOLLOWUP-2D — resolve the
  `windows` 0.61.3/0.62.2 `HWND` duplication for `overlay.rs:165,365`**
  (input: this §9 + CI run `36807093893` job `110193759211` + `cargo
  tree` evidence above). Pre-req: owner selects (a)/(b)/(c) or an
  alternative + ADR. DO NOT START here.

## 10. Governance compliance of this task

- Changed: `apps/desktop/src-tauri/Cargo.toml` (2 commits) +
  `Cargo.lock` (1 edge) + `src/lib.rs` (4 cfg-gated attributes) +
  ADR-020/ADR-021 (new) + `20_ADR_INDEX.md` (2 entry lines) + this report
  (new) + one `PROGRESS.md` entry. Deliberately unchanged: everything in
  §6.
- No dependency added/downgraded beyond the authorized 0.54→0.61.3 edge
  (already-vendored version; no new crate); no secrets touched; no
  signing; no test masked, skipped, or edited; no failed platform marked
  supported; no Windows success claimed.
- Push state: `a9602ea2..42fa7c31` → `origin/...`, 0 ahead / 0 behind;
  PR #63 head `42fa7c31`, OPEN/BLOCKED/REVIEW_REQUIRED, NOT MERGED.
- Skills actually used: `rust-engineer`, `rust-review`, `gh-cli`,
  `tauri`, `tauri-setup`, `security-guidance`, `securability-engineering`,
  `supply-chain-risk-auditor` (Cargo substitution recorded). Zero MCP
  tools called.

## Closing (exact, as tasked)

- Exact pre-fix failure: 35 errors (Families A+B+C) at run `36798675037`
  — re-derived, not assumed.
- Root causes: bare 0.54 declaration (A), 0.61-targeted code vs 0.54
  layout (B), `forbid` vs Win32 FFI (C) — all stillborn at import/restore.
- Exact changes: dependency declaration + 11 features (ADR-020) and
  crate-`deny` + 4 Windows-gated `allow`s in Soravo-owned `lib.rs`
  (ADR-021). Zero implementation-byte edits.
- Upstream comparison: declaration copied verbatim from Handy at
  `ba10ce19` (re-fetched); implementation bytes untouched
  (`HANDY-REUSE`); policy glue is `SORAVO-OWNED` (no upstream counterpart).
- Commits: `83a49672` (ADR-020 vehicle) + `42fa7c31` (ADR-021 vehicle),
  both pushed. Diff verified to contain only dependency/configuration/ADR
  changes before each commit.
- CI runs/jobs: CI `36807093893` (Windows `110193759211`: 35→2) ·
  Security Audit `36807093919` (yanked-only failure).
- Final Windows result: Families A+B+C REMEDIATED; leg still red on the
  NEW Family D (2 × E0308) — STOP, next task, not this one.
- Linux regression: none (local + CI green through `fmt`/`clippy`/`test`).
- macOS / yoke-derive: fail EXACTLY as at baseline — unchanged, owned
  elsewhere, not attributed here.

**STOP after this task. T33-P-FOLLOWUP-2D (Family D) and T33-P-FOLLOWUP-3/-4
are NOT started.**
