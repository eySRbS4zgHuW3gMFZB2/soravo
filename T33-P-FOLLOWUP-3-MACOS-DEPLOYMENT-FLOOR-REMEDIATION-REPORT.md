# T33-P-FOLLOWUP-3 — MACOS DEPLOYMENT FLOOR REMEDIATION REPORT

**Task:** T33-P-FOLLOWUP-3 — set the minimum macOS version to 10.15 using
the project's authoritative Tauri configuration (aarch64
deployment-target failure ONLY).
**Date:** 2026-10-01 (UTC).
**Branch:** `t31/soravo-wrapper-completion`.
**Start HEAD:** `245618c326400d0b147ab5f57cceec806004d346` (== origin).
**End HEAD:** `fef1d48e145bb705e907a782e00e9da9b9a58faf`
(`fix(macos): set minimumSystemVersion to 10.15 for ggml std::filesystem
floor (T33-P-FOLLOWUP-3, ADR-022)`; pushed, == origin, 0 ahead / 0 behind).
**PR #63:** OPEN, head `fef1d48e`, `MERGEABLE` / `BLOCKED` /
`REVIEW_REQUIRED` (0 of 1), `mergedAt: null`. NOT MERGED.
**Project decision (given, not reinterpreted):** ACCEPT macOS 10.15 as
Soravo's minimum supported macOS version. This task is ONLY the aarch64
deployment-target failure. It does NOT solve the x86_64 ORT problem and
claims nothing about it.
**Verdict:** The tasked aarch64 defect is REMEDIATED and PROVEN — the
bundled-ggml `std::filesystem` floor error is GONE on authoritative CI
(`transcribe-cpp-sys v0.2.3` now compiles; zero `10.15-unavailable`
errors). **STOP TRIGGERED for the remainder of the aarch64 leg:**
clearing the floor exposed a WIDER, independent, pre-existing macOS
`unsafe`-policy failure (28 × `unsafe_code = forbid` denials in
`soravo-desktop` macOS-gated files) that is OUT OF SCOPE for this task
and is NOT touched. The x86_64 leg, Windows leg, `rust`/audit failures
are byte-for-byte the same failures as baseline — unchanged and not
attributed to this task.

---

## 1. Reading-gate record (in order, this session)

| # | Item | Result |
|---|---|---|
| 1 | Root `SPEC_MANIFEST.json` | read — `spec_version 2.0`, 14 docs, `primary_platforms: [macOS, Windows]`, Tauri v2 + Rust |
| 2 | Every root manifest document, in order | read: `README.md`, `01_PRD.md`, `02_TDD.md`, `03_AI_INSTRUCTIONS.md` (366 L, §5 gate + §9 Handy Reuse First), `04_IMPLEMENTATION_PLAN.md`, `05_TASK_BREAKDOWN.md`, `06_DOD_QA.md`, `07_AI_SKILLS.md` (361 L, matrix + inventory), `08_MCP_AND_AGENT_TOOLING.md`, `09_SECURITY_BASELINE.md`, `10_ADR_INDEX.md` (platform-scope ADR rule + ADR template), `11_INTERRUPTION_HANDOFF.md`, `12_BENCHMARK_PROTOCOL.md`, `13_RELEASE_RUNBOOK.md`, `14_ENVIRONMENT_AND_SECRETS.md` |
| 2b | Canonical v6 pack (governing authority) | read: `SPEC_MANIFEST.json`, `09_AI_AGENT_INSTRUCTIONS.md` in full (permanent discipline, reading gate, skill gate, stop conditions, duty when stopped), `20_ADR_INDEX.md` index of record (up to ADR-021; next free ADR-022), `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` (pin `ba10ce19`), plus `00_README.md` authority rules; remainder carried via verified prior reads where not load-bearing |
| 3 | `PROGRESS.md` in full | read — 6,211 lines (head + full T33-O/N/P/FOLLOWUP-1/2/2A/2B tails first-hand this session) |
| 4 | Fresh Git/PR #63/CI audit | performed this session — HEAD `245618c3` == origin, tracked clean; PR #63 OPEN/BLOCKED/REVIEW_REQUIRED, NOT MERGED; CI run `36807093893` legs re-derived |
| 5 | `T33-P-T2-CROSS-PLATFORM-BUILD-VERIFICATION-REPORT.md` | read in full (295 lines); aarch64 failure re-derived, not assumed |
| 6 | `T33-P-FOLLOWUP-1-CROSS-PLATFORM-FORENSICS.md` | read in full (613 lines); §B claims each re-verified below |
| 7 | `T33-P-FOLLOWUP-2*` reports + ADR-020/ADR-021 | read: FOLLOWUP-2 (378 L), 2A (358 L), 2B report (260 L), ADR-020 + ADR-021 (governance pattern for ADR-022) |
| 8 | Exact CI workflow + implicated config + release workflow | read: `.github/workflows/ci.yml` (166 L), `.github/workflows/release.yml` (121 L, `workflow_dispatch` only, 0 runs ever), `apps/desktop/src-tauri/tauri.conf.json` (25 L), `apps/desktop/src-tauri/Cargo.toml`, `tauri.toml` (5 L, build-only, not authoritative for bundle) |
| 9 | Skill Selection Gate | executed BEFORE planning/editing — §2 |

Root-manifest docs are `HISTORICAL/STALE` pending owner reconciliation
(v6 `09` O-5); read for traceability, never used to override the v6 pack.

## 2. Skill Selection (v6 `10` schema — gate run BEFORE planning/editing)

- **Task classification:** Tauri build config (`minimumSystemVersion` —
  APPLICABLE) · Tauri toolchain/prerequisites (deployment target, runner
  env — APPLICABLE) · Rust compile-error diagnosis (aarch64 C++ build
  failure via cargo/cc/cmake — APPLICABLE) · GitHub + CI/CD (run/job/log
  evidence + push — APPLICABLE) · documentation/specification/ADR (ADR-022
  + report — APPLICABLE) · interruption/handoff/state audit (fresh audit
  — APPLICABLE) · security-general (platform-scope change, no secrets,
  least privilege — APPLICABLE). Inspected and found NOT applicable:
  Rust security review of existing code (no Rust code touched —
  `rust-review` not triggered) · dependency-version judgment (no
  dependency added/removed/upgraded/pinned — collector not runnable, facts
  from `Cargo.lock` instead) · Windows code/strategy (untouched) ·
  signing/release-execution (must not touch `release.yml`) ·
  TypeScript/React/shadcn, frontend/UI, accessibility, backend/API,
  database/Supabase, authentication, payments, Cloudflare/
  deployment-execution, MCP/tooling config, discovery, testing-skill
  execution (no test created/modified — `vitest`/`playwright` deliberately
  not selected), smart-contract workflow. Speech/audio/STT contracts: no
  skill installed — v6 §§03/05/16 govern; recorded, not invented.
  Benchmarking: no skill installed — recorded, not invented.
- **Mandatory skills selected (all actually loaded via `skill` tool):**
  `tauri` (v2 build/config correctness); `tauri-setup` (platform
  toolchain/prerequisites — deployment target, runner env);
  `rust-engineer` (compile-error diagnosis + validation commands);
  `gh-cli` (authenticated `gh` PR/CI evidence + push);
  `security-guidance` (platform-scope change; no new trust boundary,
  secret, endpoint, or IPC surface — governing rules v6 `12` + root `09`
  preserved).
- **Declined with reason:** `rust-review` (no Rust code reviewed/hardened
  — config-only change); `supply-chain-risk-auditor` (no dependency
  added/removed/upgraded/pinned — `Cargo.toml`/`Cargo.lock`
  byte-unchanged); `github` (overlaps `gh-cli`, the registry default);
  `tauri-development` (no feature development); `vitest`/`playwright` (no
  test created/modified); all frontend (`shadcn`, `react`, `vercel-*`,
  `frontend-design`, `frontend-accessibility`, `web-design-guidelines`);
  all `supabase*`; all `cloudflare*`/`wrangler`/`web-perf`;
  `securability-engineering` (no trust-boundary code authored);
  `agent-security-audit`/`mcp-server-review` (no agent/MCP config change);
  `semgrep`/`codeql` (CLIs absent on host — no SAST claim made);
  `secure-workflow-guide` (smart-contract workflow — not applicable);
  `find-skills` (no uncovered domain).
- **MCP/tools selected:** `read` (file evidence), `bash` for `git`/`gh`/
  `cargo` only, `edit`/`write` (scoped config + ADR + index). **Zero MCP
  tools called.**
- **Authority/source boundary:** repository facts from the working tree +
  `~/.cargo` vendored registry + `node_modules/.pnpm` Tauri CLI bundle; CI
  facts from authenticated `gh` (runs `36807093893`/`36809807824`, jobs
  `110193759040`/`110202118702`/etc.); no chat-history/memory claim used
  for any load-bearing fact.
- **Conflicts found:** none.
- **Result: CLEAR** — proceed to implementation (scoped config only).

## 3. First-hand verifications (each re-derived, none assumed)

| # | Required verification | Evidence |
|---|---|---|
| 1 | Current T33-P macOS aarch64 CI failure | Authoritative run `36807093893`, job `110193759040`: `-DCMAKE_CXX_FLAGS= ... --target=arm64-apple-macosx -mmacosx-version-min=10.13 ...`, then `ggml-backend-dl.h:42:39: error: 'path' is unavailable: introduced in macOS 10.15` (×20), `transcribe-cpp-sys v0.2.3` exit 101 |
| 2 | FOLLOWUP-1 forensic evidence | §B chain confirmed link-by-link: `tauri.conf.json` unset → CLI 2.12.0 default 10.13 → `MACOSX_DEPLOYMENT_TARGET` → `cc 1.4.7` → `-mmacosx-version-min=10.13` < ggml 10.15 floor |
| 3 | Current Tauri version/configuration | `Cargo.lock`: `tauri 2.12.0`; `apps/desktop/package.json`: `@tauri-apps/cli 2.12.0`; `tauri.conf.json` (25 L): `bundle.macOS` held ONLY `entitlements` — `minimumSystemVersion` unset |
| 4 | Current macOS deployment-target propagation | CLI bundle `config.schema.json`: `bundle.macOS.minimumSystemVersion` default `"10.13"`; CLI CHANGELOG: "Set the `MACOSX_DEPLOYMENT_TARGET` env var with the configuration `minimum_system_version` value"; vendored `cc-1.4.7/src/lib.rs:4530`: `deployment_from_env("MACOSX_DEPLOYMENT_TARGET")` first |
| 5 | Bundled ggml 10.15 requirement | Vendored `transcribe-cpp-sys-0.2.3/ggml/src`: `ggml-backend-dl.h:14`, `ggml-backend-reg.cpp:7` `#include <filesystem>` + `namespace fs = std::filesystem`; CI libc++ markers: `introduced in macOS 10.15` |
| 6 | Change does not claim to solve x86_64 | Job `110193759114` (same runs): `ort-sys@2.0.0-rc.12: ort does not provide prebuilt binaries for the target 'x86_64-apple-darwin'` — independent distribution-table limitation; ADR-022 states this explicitly; x86_64 leg byte-identical before/after |

## 4. ADR governance (no number invented)

- Index of record `docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`
  listed up to ADR-021 (ADR-017 absent, not reused — status unknown,
  collision risk per 2B precedent). **ADR-022 is the next valid
  identifier; nothing overwritten.**
- Root `10_ADR_INDEX.md` (`ADR-022 — Supabase admin role`) and
  `decisions/` belong to a different, older sequence — disambiguated in
  the ADR header exactly per the ADR-020/021 pattern.
- Root mirror `20_ADR_INDEX.md` untouched (pointer only, per mirror policy).
- ADR-022 follows the project template (Status/Date/Context/Decision/
  Alternatives/Security/Performance/Operational/Testing/Rollback/
  Consequences) plus the 2B file-scope disclosures.

## 5. Exact implementation (one config key + ADR + index line)

```diff
--- a/apps/desktop/src-tauri/tauri.conf.json
+++ b/apps/desktop/src-tauri/tauri.conf.json
     "macOS": {
-      "entitlements": "./Entitlements.plist"
+      "entitlements": "./Entitlements.plist",
+      "minimumSystemVersion": "10.15"
     },
```

- Commit `fef1d48e`: `tauri.conf.json` (1 key) + ADR-022 (new) + index
  (1 line). `git diff --check` clean; `cargo fmt --all -- --check` exit 0.
- Deliberately unchanged (verified by `git diff --name-only`): every Rust
  source; every `Cargo.toml`/`Cargo.lock`/`pnpm-lock.yaml`; `ci.yml` (no
  job added/removed/weakened); `release.yml` (untouched, never
  dispatched); `Entitlements.plist`; Windows sources/legs; x86_64
  strategy; `yoke-derive`; catalog/model assets; Handy `paste_tx/` and
  transcription behavior; UI; all tests; signing/release configuration.

## 6. Validation (all first-hand, GitHub authoritative)

Fix commit `fef1d48e` → CI run `36809807824` (`completed`/`failure`) +
Security Audit `36809807820` (`completed`/`failure`;
`npm-audit`/`cargo-deny` success, `cargo-audit` fails ONLY on the
pre-existing `yoke-derive 0.8.3` yanked denial).

| Gate | Result |
|---|---|
| Linux checks green | `web` success · `e2e` success · `desktop` (Linux) success · local `cargo fmt` exit 0 · CI `rust` fails ONLY at the `cargo audit` step (`fmt`/`clippy`/`test` passed) — no source regression |
| aarch64 tasked defect | **REMEDIATED:** job `110202118702` shows `Compiling transcribe-cpp-sys v0.2.3` (03:20:46) → `Compiling transcribe-cpp v0.2.3` (03:21:33, proves success) → `Compiling transcribe-rs v0.3.11`; **zero** `unavailable: introduced in macOS 10.15` errors (grep count 0); final failure is `could not compile 'soravo-desktop' (lib) due to 28 previous errors` — a LATER crate, not the tasked one |
| Generated deployment target >= 10.15 | `tauri.conf.json` declares `"10.15"` (`python3 -m json.tool` valid); propagation mechanism proven (§3.4); the previously-failing ggml compilation now succeeds with the floor as the ONLY change — the effective flag is therefore >= 10.15 (cargo hides successful build-script stdout, so no literal flag line exists in the success log; recorded, not disguised) |
| No signing/release involved | Job step is `pnpm tauri build --no-bundle` ("no bundle, no signing"); committed tree has zero `secrets.*`/*tauri-action* additions; `release.yml` untouched; `gh run list --workflow=release.yml` returns empty (0 runs ever); `tauri.conf.json` carries no secret |
| x86_64 not claimed | Job `110202118603`: unchanged `ort-sys ... does not provide prebuilt binaries for 'x86_64-apple-darwin'` (FOLLOWUP-4) |
| Windows unchanged | Job `110202118660`: unchanged 2 × E0308 Family D (`overlay.rs`, HWND 0.61.3 vs 0.62.2) |
| Handy behavior unchanged | Zero Handy/transcription bytes touched; transcription semantics identical; only the shipped-OS floor declared |

## 7. STOP — newly exposed independent macOS `unsafe` failure (NOT fixed, NOT started)

Clearing the floor exposed the next aarch64-compile layer in
`soravo-desktop` (lib), `could not compile due to 28 previous errors` —
all `usage of an 'unsafe' block is forbidden` (`unsafe_code = "forbid"`,
workspace policy) at macOS-gated sites including
`apple_intelligence.rs:20,41,49,55,61,70`, `autostart.rs:64,65,71,83`,
`input.rs:27,50,62,80,88,95,102,111,151,164`, `paste_tx/macos.rs:62,92,
293,148`, `secure_input.rs:144,283`, `clipboard.rs:22`,
`commands/mod.rs:159` (plus registry-internal frames correctly excluded
from any allowlist). This is the macOS analogue of the Windows Family C
already decided in ADR-021 — which explicitly records "macOS `unsafe`
surfaces explicitly NOT covered (FOLLOWUP-3/-4 own them)" — and the exact
v6 `09` stop condition "the first compiler error indicates a wider
migration than the task scope". It is RECORDED here as the smallest
deterministic next task (new follow-up: scoped macOS `unsafe` policy for
the Handy-derived macOS FFI, ADR-required per v6 `12`:14, T05-B mechanics
as precedent) with the exact files/lines above as its input. No file
involved was touched, read-for-modification, or re-scoped by this task.

## 8. Governance compliance

- Changed: `tauri.conf.json` (1 key) + ADR-022 + index line + this report
  + one `PROGRESS.md` entry. Nothing else.
- No dependency added/downgraded/upgraded; no secrets touched; no
  signing; no test masked, skipped, or edited; no failed platform marked
  supported; no aarch64 success claimed (leg still red — on the new
  failure, honestly reported).
- Push state: `245618c3..fef1d48e` → `origin/...`, 0 ahead / 0 behind; PR
  #63 head `fef1d48e`, OPEN/BLOCKED/REVIEW_REQUIRED, NOT MERGED.
- Skills actually used: `tauri`, `tauri-setup`, `rust-engineer`, `gh-cli`,
  `security-guidance`. Zero MCP tools called.

## Closing (exact, as tasked)

- **Exact pre-fix failure:** `-mmacosx-version-min=10.13` (Tauri 2.12.0
  default) vs bundled ggml `std::filesystem` floor 10.15 — Soravo
  workflow/configuration defect.
- **Root cause:** omitted `minimumSystemVersion` in `tauri.conf.json`.
- **Exact change:** `"minimumSystemVersion": "10.15"` (config-only).
- **Upstream comparison:** no Handy counterpart for the floor (Handy has
  no Tauri floor decision in this repo's provenance); the ggml sources are
  third-party vendored bytes, untouched.
- **Smallest fix:** one key; release + CI fixed consistently by construction.
- **Commit SHA:** `fef1d48e145bb705e907a782e00e9da9b9a58faf` (pushed).
- **CI runs/jobs:** CI `36809807824` (aarch64 job `110202118702`:
  ggml defect GONE, new `unsafe` failure exposed) · Security Audit
  `36809807820` (yanked-only failure).
- **Final aarch64 result (this defect):** REMEDIATED. **aarch64 leg
  overall:** still red on the new `unsafe`-policy failure — STOP, next
  task, not this one.
- **x86_64:** explicitly NOT solved, NOT claimed (FOLLOWUP-4).

**STOP after this task. The macOS `unsafe`-policy follow-up and
T33-P-FOLLOWUP-4 are NOT started. PR #63 is NOT merged.**

*Authority: `SPEC_MANIFEST.json` + manifest documents + v6 pack +
`PROGRESS.md` + `gh`/`git`/filesystem first-hand evidence. Skills
actually loaded: `tauri`, `tauri-setup`, `rust-engineer`, `gh-cli`,
`security-guidance` (see §2). STOP conditions from the brief ("another
independent failure" — TRIGGERED, classified in §7, not repaired).*
