# T10-COMMERCIAL-GATE-EVIDENCE-020 — Moonshine-Tiny Gap-Closure Follow-up (Evidence Only)

**Date:** 2026-10-09 (UTC)
**Task:** T10-COMMERCIAL-GATE-EVIDENCE-020 (follow-up to `T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md`)
**Type:** Evidence-only. Single model (`handy-computer/moonshine-tiny-gguf`). No licensing classification changed. No production registry change. No model cleared. No Parakeet integration started.
**Worktree:** `.swarm-worktrees/state-audit-2026-10-09/` @ detached `82ec2ecc1ba279dfa9176f1612943368d65d3616` (verified `origin/main` tip; re-checked clean before work — sole pre-existing untracked file was the audit report).
**Catalog under review:** `apps/desktop/src-tauri/src/catalog/catalog.json` (catalog_version 2, generated 2026-08-17T11:27:14+00:00, mirror `https://blob.handy.computer`) — read-only.
**Prior context:** `T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md` (2026-10-09, pilot — six §6 gaps); `.swarm-worktrees/state-audit-2026-10-09/STATE-AUDIT-2026-10-09-REPORT.md` (2026-10-09 state audit, baseline for this task).
**Owner boundary (not reopened):** Parakeet Unified EN 0.6B Q8_0 use approved, subject to NVIDIA credit during website redesign. Recorded in §7; no inference to other models; no registry or gate change.

## 0. Gate records

### 0.1 Skill-selection gate

Task domains: GitHub/Git (upstream + artifact inspection), Security incl. supply-chain (model-artifact review), Rust (catalog/model-manager context, read-only). Loaded the narrowest installed skills (all present under `~/.agents/skills/`, all loadable):

| Skill | Matrix domain | Used for |
|---|---|---|
| `github` | GitHub/Git | `gh pr view/checks` workflow for PR #115 recheck |
| `supply-chain-risk-auditor` | Security (supply chain) | artifact↔upstream linkage discipline; no-inference-from-availability rule |
| `security-guidance` | Security (ASVS-aligned) | untrusted model-metadata posture; checksum≠authorization |
| `rust-review` | Rust (review) | read-only catalog/`mod.rs` context; no code touched |

Not loaded (with reason): `semgrep`/`codeql` (no source scan in scope), `secure-workflow-guide` (smart-contract workflow, inapplicable), `securability-engineering` (generation skill; evidence-only task), `rust-engineer` (implementation skill; no implementation), frontend/Tauri/Supabase/Cloudflare/testing skills (outside scope). Project-local `.opencode/skills/` remains ABSENT (HISTORICAL/STALE risk carried from audit; no named-but-absent skill was claimed). No skill is a legal licensing authority — conclusions rest on located primary-source bytes, not skill guidance.

### 0.2 Authorities read before work

1. `STATE-AUDIT-2026-10-09-REPORT.md` (full, §§1–60 re-read; remainder carried VERIFIED from prior session).
2. `T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md` (full, 160 lines, re-read — read-only from dirty-tree path; file untouched).
3. `docs/archive/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` v3.0.0 (full — SOFTWARE ≠ WEIGHT-REDISTRIBUTION ≠ HOSTING; unknown = BLOCKED; audit trail §10).
4. v6 `08_TASK_BREAKDOWN.md` T10 acceptance (carried VERIFIED); v6 `19_STATE_AUDIT_PROTOCOL.md`, `20_ADR_INDEX.md`, `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` (pin `ba10ce19`), `09_AI_AGENT_INSTRUCTIONS.md`, `18_INTERRUPTION_AND_HANDOFF.md` (carried VERIFIED from audit session; re-read on interruption only if context invalidated — not invalidated).
5. Local `catalog.json` entries: `handy-computer/moonshine-tiny-gguf` (via 019, unchanged) and `handy-computer/parakeet-unified-en-0.6b-gguf` (lines 1–40, re-read this task).

Non-authorizations observed ( Standing): no edits to `MODEL_LICENSES.*`, `catalog.json`, `catalog/mod.rs`, model manager, classifications, plans, scopes, workflow state, ADRs, `docs/COMPLIANCE/`; no commit/stage/push/PR/merge; no contact with `feature/r1-gap-021-desktop-auth` content (status-only re-check); byte-level artifact downloads NOT performed (no explicit authorization).

## 1. The six exact evidence gaps and their individual status

| # | 019 gap | Status after this task | Basis |
|---|---|---|---|
| 1 | Upstream weight file manifest at `390624e` + per-file mapping to the three GGUF outputs | PARTIALLY CLOSED (manifest VERIFIED; mapping still MISSING) | HF API `https://huggingface.co/api/models/UsefulSensors/moonshine-tiny/revision/390624e` returns full SHA `390624ed33d594443aa4aa221f5b9f283b545b5a`, 7 siblings (`.gitattributes`, `README.md`, `config.json`, `generation_config.json`, single-shard `model.safetensors`, `preprocessor_config.json`, `tokenizer.json`), `safetensors.parameters.F32: 27092736`. Per-file source→GGUF mapping: no conversion log located — still MISSING. |
| 2 | Converter verification: transcribe.cpp commit `07a8a84` existence + version + conversion script/log with digests | PARTIALLY CLOSED (existence VERIFIED; log/script still MISSING) | GitHub API `https://api.github.com/repos/handy-computer/transcribe.cpp/commits/07a8a84` returns full SHA `07a8a84b385474d70707715c44b23bdf2facf513`, date `2026-05-06T00:45:09Z`, message `basic small/medium streaming working` — consistent with card "validated … on 2026-05-05/06" and artifact-repo creation 2026-05-06. No conversion script, log, or input/output digests located. |
| 3 | Revision pin of the rights-holder LICENSE text (which commit; does it predate `390624e`) | PARTIALLY CLOSED (history PINNED; retroactive application = owner/legal BLOCKED) | GitHub API `…/moonshine-ai/moonshine/commits?path=LICENSE&per_page=20` returns exactly 3 commits: `7f7d810e` (2026-02-25, LICENSE created — MIT + Community terms), `97b723db` (2026-08-24, streaming-models MIT), `547d0066` (2026-08-24, "MIT default for all models, enumerated non-commercial exception list"). TEMPORAL FINDING: the LICENSE file (2026-02-25) and the MIT-default text (2026-08-24) both POSTDATE weight publication (weight repo created 2024-10-30, `lastModified: 2025-01-30`). Whether the grant covers weight commit `390624e` retroactively is a LEGAL DETERMINATION — owner-gated, not inferred here. |
| 4 | Artifact-specific redistribution authorization (or legal determination that MIT model grant suffices for third-party GGUF redistribution) | UNVERIFIED — BLOCKED | HF API `https://huggingface.co/api/models/handy-computer/moonshine-tiny-gguf` confirms tags `base_model:moonshine-ai/moonshine-tiny`, `license:mit`, 3 GGUF siblings, HEAD `83c2af35` (2026-09-15; catalog pins older Handy revision `f5c11906…` — recorded as observation, not tampering evidence). No grant/assignment/permission instrument located. Card "Inherited MIT" remains claim-only. |
| 5 | `blob.handy.computer` hosting/mirror authorization chain | UNVERIFIED — BLOCKED | `GET https://blob.handy.computer` → HTTP 404 at root (host responds; no authorization content). No hosting grant, mirror agreement, or authorization chain located. Reachability ≠ authorization. |
| 6 | `moonshine-ai` vs `UsefulSensors` base-model alias at weight-repo level | CLOSED — VERIFIED | Both `…/api/models/UsefulSensors/moonshine-tiny/revision/390624e` and `…/api/models/moonshine-ai/moonshine-tiny` return identical `_id: 672283c56d880221137b7538`, `id: moonshine-ai/moonshine-tiny`, `author: moonshine-ai`. HF resolves the predecessor org name to the renamed repo. Canonical weight id: `moonshine-ai/moonshine-tiny` @ full SHA `390624ed33d594443aa4aa221f5b9f283b545b5a`. Clarification: card "pinned 2026-05-05" is the Handy port/validation date, not the upstream commit date. |

**Chain verdict: INCOMPLETE — BLOCKED for any commercial-use, redistribution, or hosting reliance.** Gap 6 closed; gaps 1–3 advanced to their evidence limit (residual = missing third-party conversion records + owner/legal determinations); gaps 4–5 have no further evidence-side closure available.

## 2. Evidence examined and its source

- `apps/desktop/src-tauri/src/catalog/catalog.json` lines 1–40 (local file, clean worktree): `handy-computer/parakeet-unified-en-0.6b-gguf`, revision `7e948f21…`, `base_model: nvidia/parakeet-unified-en-0.6b`, `license: cc-by-4.0`, `default_quant: Q8_0`, 6 files with SHA-256 — VERIFIED read-only (identity context for §7 boundary; no change).
- HF Model API ×3 (fetched 2026-10-09, `webfetch` format text): UsefulSensors-revision endpoint, moonshine-ai canonical endpoint, handy-computer artifact endpoint — VERIFIED (payloads quoted in §1).
- GitHub Commits API ×2 (fetched 2026-10-09): transcribe.cpp `07a8a84` (full JSON retrieved; date/message extracted from saved tool output via read-only grep), moonshine `?path=LICENSE` (3 commits, messages quoted in §1) — VERIFIED.
- GitHub commit HTML page for transcribe.cpp `07a8a84` (title `basic small/medium streaming working · handy-computer/transcribe.cpp@07a8a84`) — corroborating only; API JSON is the evidence of record.
- `GET https://blob.handy.computer` → 404 — VERIFIED (absence-of-grant recorded as evidence, not as authorization).
- `git -C .swarm-worktrees/state-audit-2026-10-09 status/rev-parse` (clean, detached `82ec2ecc`) — VERIFIED pre- and post-task.
- `gh pr view 115 --json` + `gh pr checks 115` (see §5) — VERIFIED (gh path recovered since audit).
- NOT examined (no authorization): byte-level GGUF downloads, upstream weight file contents, transcribe.cpp source, `docs/COMPLIANCE/` write path, dirty-tree R1 files beyond status listing.

## 3. Independent reviewer identity/role and actual outcome

- **Formal Stage-B `reviewer` dispatch: BLOCKED (mechanical).** Two attempts: (1) rejected `ACCEPTANCE_FIELD_REQUIRED` — re-dispatched with an `ACCEPTANCE:` line; (2) rejected `TASK_WORKFLOW_STAGE_A_REQUIRED` — Stage B requires a `pre_check_passed` state that only a code-change task workflow produces; this evidence-only task has no changed files to pre-check. No override was attempted.
- **Independent re-verification actually performed:** a fresh-context `general` subagent (identity: AI evidence checker, explicitly NOT a human reviewer and NOT a legal authority) independently re-fetched all six primary sources. Outcome: **6/6 author claims CONFIRMED** with quoted bytes (identical `_id`/SHA/siblings; identical commit SHAs/dates/messages; identical artifact tags/HEAD; identical 404; identical catalog entry). **No new discrepancy found** (one minor precision note: "3 GGUF siblings" = 3 GGUF files within 5 total siblings — adopted in §1).
- **Checker verdict handling (no impersonation):** the checker stated "Chain verdict: COMPLETE." That verdict is RECORDED but NOT ADOPTED — an AI checker cannot close a licensing chain, and per §17 gaps 4–5 remain UNVERIFIED, so policy mandates INCOMPLETE/BLOCKED. It is reported here as the checker's stated opinion, not as review approval.
- **Remaining review debt — BLOCKED (owner-gated):** formal independent HUMAN review (re-verify chain links, rule on MIT-text→weight→GGUF redistribution sufficiency, close/accept gaps 1–5 residual) and recording of the outcome in the compliance audit trail (`docs/COMPLIANCE/model-licenses.md`, model manifest, release notes per §17 §10). No self-approval claimed at any point.

## 4. Changes made, with exact files and diff summary

- **Created (sole change):** `.swarm-worktrees/state-audit-2026-10-09/T10-COMMERCIAL-GATE-EVIDENCE-020-REPORT.md` (this file) — evidence report, authorized as the task's single deliverable artifact.
- **Diff summary:** +1 untracked file in the isolated worktree; zero modifications to tracked files (`git diff` empty); dirty main worktree untouched (status re-checked identical); no commits, stages, pushes, or PR actions.
- **Compliance-trail write (`docs/COMPLIANCE/model-licenses.md`): NOT EXECUTED** — DEFERRED pending the blocked human review (§3); writing compliance assertions before that review would itself be an unauthorized clearance signal.
- **Registry/catalog/model-manager/CI/workflows/ADRs:** untouched — VERIFIED via empty `git diff`.

## 5. Tests/checks executed and results

- **PR #115 recheck — VERIFIED (gh path recovered):** `gh pr view 115 --json` → state OPEN, title `T10-RECON-005: zero-clearance commercial license registry correction (0/69 cleared, fail-closed gate)`, head `17f34870`, base `82ec2ecc` (= current `origin/main`), `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`, `reviewDecision: ""` (empty — no review recorded). `gh pr checks 115` → **7/7 pass** (run 37914660901: desktop 5m44s, Windows 10m21s, macOS-aarch64 8m51s, macOS-x86_64 7m2s, e2e 51s, rust 2m38s, web 44s). NOT merged per task prohibition; no merge recommendation made (review posture unresolved).
- **Audit discrepancy resolved:** the audit report recorded PR #115 state/checks as UNKNOWN (gh hung at audit time). That record stands as correct-for-its-time (HISTORICAL/STALE for the checks dimension); current values above supersede it for forward decisions. No historical evidence rewritten.
- **Code gates (lint/test/SAST/build): NOT EXECUTED** — no code created or modified; nothing to gate. Fail-closed posture preserved by inaction, not by bypass.
- **Primary-source fetches:** 7 fetches, all HTTP 200 except the recorded 404 — VERIFIED (§2).

## 6. Remaining blockers and owner-gated decisions

1. **Legal determination (owner):** whether the moonshine-ai MIT model-default text covers weight commit `390624e` retroactively, and whether it suffices for third-party GGUF redistribution (gaps 3-residual, 4). No engineering inference permitted. — BLOCKED.
2. **Hosting/mirror authorization (owner/upstream):** `blob.handy.computer` grant chain (gap 5). — BLOCKED.
3. **Third-party conversion records (Handy/provenance):** conversion script/log + input/output digests linking `390624e` → the three cataloged GGUF SHAs (gaps 1–2 residual). Only the artifact publisher can supply these. — BLOCKED (external).
4. **Formal independent human review + compliance-trail recording** (§3). — BLOCKED.
5. **Parakeet boundary carried forward:** owner approval of Parakeet Unified EN 0.6B Q8_0 is recorded, NOT reopened; the NVIDIA-credit obligation falls due at website redesign (T13), which is itself gated behind T10/T11/security/T14-prep per §08 order. No Parakeet integration started in this task. — DEFERRED (to T13).
6. **Moonshine non-English Tiny variants** (`-ar/-ja/-ko/-uk/-vi/-zh` in catalog): untouched by this pilot; under the MIT-default text they sit outside the legacy exclusion list only if not named in it — per-model verification NOT performed, no inference drawn. — NOT EXECUTED.

## 7. The next canonical task after T10

Per v6 §08 execution order, T10 as a whole remains REMAINING until §08 acceptance (exact artifact, publisher, source URL, license, commercial use, redistribution, hosting, checksum, provenance, release decision — per shipped model) is satisfied. The next executable evidence step is **T10-COMMERCIAL-GATE-EVIDENCE-021 (or owner-directed equivalent): apply this report's closed links (canonical weight id + full SHA + manifest + converter pin + LICENSE history) to the NEXT catalog model in priority order, and escalate the owners-legal bundle (blockers 1–4) as a single decision packet** — evidence work continues to narrow, but no model may clear without the owner/legal determinations above. Downstream sequence stays: T11 (real STT benchmark protocol execution) → Phase 6 security → T14-prep → T13 (incl. Parakeet NVIDIA credit) → T15 → T14-validation → rehearsal → release. R1 gaps and T34-SYNC items remain owner/ADR-gated and were not touched.

**NO REGISTRY CHANGE; NO MODEL CLEARED.** No commercial release recommended. Fail-closed gate preserved.

*End of report. Evidence-only; Parakeet integration not started; handoff per `18_INTERRUPTION_AND_HANDOFF.md`: next safe action for the following session is to repeat the reading gate (§18), re-verify worktree clean state, then proceed with T10-021 or the owner-legal escalation packet.*
