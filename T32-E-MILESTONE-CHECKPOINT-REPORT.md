# T32-E — Milestone Checkpoint: T32-A + T32-B

**Date:** 2026-09-29
**Task:** T32-E — Commit T32-A documentation reconciliation + T32-B payment-checkout hardening so PR #63 CI covers the delta
**Status:** CHECKPOINT COMMITTED AND PUSHED — CI COVERAGE PROVIDED BY PR #63
**Branch:** `t31/soravo-wrapper-completion` (unchanged — see §4 branch decision)
**Commit base (parent):** `648d110d286b81a8a0ce1d203f7a5407936ebc51`
**`origin/main`:** `ede495b55efd95cedd882d90a19d12b4777da852`
**Merge-base:** `ede495b55efd95cedd882d90a19d12b4777da852` (identical to `origin/main` — no divergence)
**PR:** #63 — https://github.com/eySRbS4zgHuW3gMFZB2/soravo/pull/63 (base `main`, head `t31/soravo-wrapper-completion`)
**Authority:** `SPEC_MANIFEST.json` + `Soravo_Engineering_Docs_v6/` §00–§21 + `T16-FINAL-COMPLETION-MATRIX.md` + T29/T30/T31/T32-A/T32-B/T32-C/T32-D
**V1 rule honoured:** no Handy STT/audio/VAD/engine/language/filler/normalization file touched or staged. No transcription test modified.
**Merge:** NOT performed. Out of scope.

---

## 0. Reading gate (completed this session)

Per v6 §00 mandatory read order and the T32-C/T32-D reading gate:

1. `SPEC_MANIFEST.json` — read.
2. v6 control pack §00–§21 — **all 22 files read**:
   `00_README`, `01_AUTHORITY_AND_SOURCE_OF_TRUTH`, `02_PRODUCT_REQUIREMENTS`, `03_TECHNICAL_DESIGN`, `04_HANDY_FORK_AND_REUSE_POLICY`, `05_DESKTOP_CONTRACTS`, `06_WEB_CLOUD_PAYMENT`, `07_IMPLEMENTATION_PLAN`, `08_TASK_BREAKDOWN`, `09_AI_AGENT_INSTRUCTIONS`, `10_AI_SKILLS`, `11_MCP_AND_AGENT_TOOLING`, `12_SECURITY_BASELINE`, `13_DEFINITION_OF_DONE_AND_QA`, `14_CI_CD_AND_BRANCHING`, `15_ENVIRONMENT_AND_SECRETS`, `16_TEST_AND_BENCHMARK_PROTOCOL`, `17_RELEASE_RUNBOOK`, `18_INTERRUPTION_AND_HANDOFF`, `19_STATE_AUDIT_PROTOCOL`, `20_ADR_INDEX`, `21_HANDY_SOURCE_CHAIN_OF_CUSTODY`. (`DESIGN.md` skimmed — not task-relevant; this is a payment/docs checkpoint, not a visual-redesign task per v6 §07 Phase 8.)
3. `PROGRESS.md` — read in full (1–2086 pre-edit, through the T32-D entry).
4. `T16-FINAL-COMPLETION-MATRIX.md` — read; **not modified**.
5. `T29`, `T30`, `T31`, `T32-A`, `T32-B`, `T32-C` (all 395 lines), `T32-D` report + `T32-D-SORAVO-BLOCKER-EXECUTION-MATRIX.md` (all 240 lines) — read.
6. Live git / PR / CI inspected this session (§1).

## 1. State audit (v6 §19)

| Field | Value |
|---|---|
| Audit SHA (parent) | `648d110d286b81a8a0ce1d203f7a5407936ebc51` |
| Branch | `t31/soravo-wrapper-completion`, in sync with `origin/t31/soravo-wrapper-completion` (0 ahead / 0 behind) |
| `origin/main` | `ede495b55efd95cedd882d90a19d12b4777da852` |
| Merge-base | `ede495b55efd95cedd882d90a19d12b4777da852` |
| Worktree | dirty before this task (T32-A doc delta + T32-B checkout delta, uncommitted) |
| Untracked files | 18 pre-existing paths (T22–T31 reports + `apps/desktop/.env.example` + `apps/desktop/src-tauri/tauri.toml` + `deno.lock` + `docs/archive/spec-v3/spec-v3/` + `reports/`) — **all preserved, none staged** |
| Other worktrees | 3 swarm worktrees under `.swarm-worktrees/` (unrelated, untouched per v6 §18 "never delete other worktrees") |
| `git fetch` | succeeded; only two stale `origin/dependabot/*` refs pruned |
| PR state | #63 OPEN, base `main`, head `t31/soravo-wrapper-completion`; #62 OPEN (other milestone) |
| CI (pre-existing, at `648d110d`) | `CI` run `36509157391` = **FAILURE**; `Security Audit` run `36509157409` = **SUCCESS** |
| Deployment | none (unchanged; Cloudflare remains BLOCKED per T32-C §15) |
| Supabase | `verify_jwt = true` set for `payment-checkout` (staged change); webhook `verify_jwt = false` unchanged |
| Razorpay | TEST only. No LIVE operation. `RAZORPAY_PLAN_SORAVO_MONTHLY_*` still `UNKNOWN` (human Dashboard action) |
| Secrets | existence-only accounting. No value read, printed, or staged |
| Model licensing | still BLOCKED (T30 10-item checklist) |
| Benchmark | not executed (unchanged; v6 §16) |
| Desktop build | not executed by this task |
| Blockers | unchanged from T32-C/T32-D; see §7 |

## 2. T32-A and T32-B contract review (T32-B report vs. actual diff)

The staged T32-B delta was re-read against the T32-B report and against v6 §06 (payment contract), §12 (security baseline), §15 (secrets), §03 (payment catalog source of truth), and ADR-005 (shared `@soravo/payment-domain`). **The report's claims hold.**

Confirmed in the staged diff:

- **Auth**: Supabase platform JWT gate (`verify_jwt = true`) **plus** authoritative `auth.getUser(token)` confirmation inside the function. A structurally-valid-but-unverifiable token cannot reach business logic. This closes T16 domain 11 / F-01's "decoded but never verified" class.
- **Server-authoritative pricing**: product/price/currency derived from `packages/payment-domain` (`getRegionalPrice`, `getProduct`, `CURRENCIES`) — the single catalog named by v6 §06:12 and ADR-005. Client-supplied `amount` and `userId` are ignored, not trusted (v6 §12:17).
- **TEST-mode enforcement**: `isTestModeKeyId` rejects any `rzp_live_*` key ID and fails closed (`readCheckoutEnv` returns `null` → 503). This is exactly the v6 §15:22 "Never substitute LIVE credentials" control, and it is what the two `rzp_live_*` strings in the test file assert as **rejection** cases.
- **No invented plan IDs**: monthly plan IDs are read from `RAZORPAY_PLAN_SORAVO_MONTHLY_{INR,USD,CAD,EUR,AUD}` and the request fails closed when unset. This is the refusal T32-C §9 and T32-D D5 both demanded of `service.ts:205`, which still fabricates `plan_<product>_<currency>` (recorded, not touched — out of T32-E scope).
- **Runtime separation**: `checkout.ts` is Deno-free, testable logic; `index.ts` is thin wiring (`Deno.serve`, `createClient`). This is what makes the 22 unit tests possible at all (T16 F-09 class).
- **Test integrity**: 15 prior tautological assertions replaced by 22 contract tests asserting *server-derived* values — a test that echoed the code's own output would not have caught the T31 defect class. `fetch` is mocked; no network.
- **Dependency hygiene**: 4 dev tools added with **exact pins** (no ranges) — `eslint@10.11.0`, `@eslint/js@10.0.1`, `typescript@6.0.3`, `typescript-eslint@8.70.1`. `pnpm-lock.yaml` delta is **+12 / −0**: no existing dependency was upgraded, removed, or re-resolved (v6 §07 dependency rule: smallest compatible change, no broad churn).
- **Workspace isolation**: `pnpm-workspace.yaml` globs do not include `supabase/functions/**`, so the new function `package.json` is not a workspace member and does not affect workspace installs. Verified `pnpm install --frozen-lockfile --lockfile-only` passes.
- **Lockfile/policy consistency**: `checkout.ts:9` documents that live Razorpay may return status `pending` (accepted per report policy) while webhooks are authoritative, consistent with v6 §06:19.

### 2.1 Residual observation (LOW, pre-existing, NOT introduced by T32-B, NOT fixed here)

`parseJWTClaims` (`checkout.ts`) decodes the JWT payload with `atob()`. The JWT payload segment is **base64url**; `atob()` implements forgiving-**base64** decode and rejects `-` and `_`. This is the same code path that T16 domain 11 already recorded as F-01 (`payment-checkout/index.ts:76-88` at HEAD, confirmed this session via `git show HEAD:`).

Probed empirically this session:

- `atob("ab-d")` and `atob("ab_d")` → **rejected**; `atob("++//")` → accepted. So the alphabet mismatch is real.
- A 6-bit group equal to 62/63 requires a source byte `>= 0xE0` (either the group's own high byte, or the low byte of a straddling pair). For pure-ASCII JSON payloads **zero** such byte pairs exist.
- 200 000 generated realistic Supabase JWT payloads (ASCII JSON, `iss`/`ref`/`role`/`iat`/`exp`/`session_id`/`sub`/`email`/`app_metadata`) → **0** contained `-` or `_`.
- A 20 000-iteration non-ASCII `user_metadata` sweep (Latin-1 + U+2713, lead bytes `< 0xE0`) → **0** hits.

Therefore the false-rejection window is bounded to a non-ASCII JWT claim whose UTF-8 contains a lead byte `>= 0xE0` (i.e. roughly U+1000 and above, including emoji), which would cause a **valid** token to be rejected `401` before `auth.getUser` runs.

Assessment, recorded rather than fixed:

- **Direction is fail-closed.** A rejected valid token is an availability defect, not a security bypass. The authoritative check is `auth.getUser`; `parseJWTClaims` is only a structural pre-filter, so a parse failure denies rather than admits. This is the safe direction.
- **Not a T32 regression.** The identical `atob` call is at HEAD; T32-B preserved, and did not worsen, the semantics.
- **Not fixed here** because no in-repo contract specifies the base64url handling and v6 §00 forbids inferring missing facts. Recorded as a follow-up finding in §7.

## 3. Validation executed (this session, on the final staged state)

| Command | Result |
|---|---|
| `pnpm test:supabase` | **PASS** — 3 files, **200/200 tests**; 22 in `supabase/tests/payment-checkout.test.mjs` |
| `pnpm lint` | **PASS** — website + desktop + license-api + payment-domain + `lint:checkout` (ESLint, Deno-aware, `--max-warnings=0`) |
| `pnpm typecheck` | **PASS** — website + desktop + license-api + payment-domain + `typecheck:checkout` (`tsc --noEmit`) |
| `pnpm install --frozen-lockfile --lockfile-only` | **PASS** — lockfile in sync with `package.json` |
| secret scan `supabase/functions/payment-checkout/` | **0 findings** (6 files) |
| secret scan `supabase/tests/` | **0 findings** (6 files) |
| staged-content secret-shape grep | 5 hits, all benign — see §3.1 |
| staged artifact scan (`target/`, `node_modules/`, `dist/`, `build/`, `coverage/`, `test-results/`, `.pnpm-store/`) | **none staged** |
| `git diff --check` (working-tree delta, pre-stage) | 2 hits: `09_AI_AGENT_INSTRUCTIONS.md:122` (**fixed**) + `PROGRESS.md:4` (**retained**, see §5) |
| `git diff --cached --check` (full staged set, pre-commit) | 7 hits in 2 files, all Markdown hard breaks, all exactly 2 spaces, 0 tabs, 0 lines with 3+ spaces: `PROGRESS.md:4-5`, `T32-A-HANDY-V1-POLICY-RECONCILIATION-REPORT.md:3-7` — **retained**, see §5 |
| `git diff --cached --stat` | 22 files, **+2638 / −446** |

Targeted validation level achieved: **L2 (integration)** for the payment boundary — `supabase/tests/` drives `checkout.ts` end-to-end against mocked provider/network responses. **Not L3/L4**: no deployed replay, no real Razorpay TEST Plan, no live Supabase function execution (both external-gated, §7).

### 3.1 Secret-shape grep triage

Five matches in the staged content, all non-credentials:

1. `T32-C` report prose describing that `service_role` **exists** (redacted, no value) — v6 §15 requires existence-only reporting.
2. Test fixture header prefix `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.` — the unencoded public JWT header string, not a signature or key.
3. `const TEST_KEY_ID = "rzp_test_fixturekeyid";` — self-describing fixture.
4. `isTestModeKeyId("rzp_live_anything")` → asserts `false`. Negative control.
5. `RAZORPAY_KEY_ID: "rzp_live_denied"` → asserts `readCheckoutEnv` returns `null`. Negative control.

Items 4 and 5 are the *rejection* tests required by v6 §15:22; their presence is contract evidence, not leakage. No `rzp_live_` real key, `whsec_`, `sk_`, signed JWT, or service-role value exists in the staged set.

## 4. Branch decision (resolved against current repository state)

The task permitted a dedicated milestone branch "if required by current repository state". **It was not required, and none was created.**

Evidence:

- T32-D execution plan item 1 is explicit: *"**PR #63 CI must cover the delta**"* (`T32-D-SORAVO-BLOCKER-EXECUTION-MATRIX.md:223`), repeated at `:70` (D4) and `:148`/`:154` (D12).
- PR #63 already exists, is OPEN, targets `main`, and its head is the current branch. A push here updates it, which is exactly the required CI coverage.
- A `t32/*` branch from the same HEAD would produce a second PR containing PR #63's commits plus this one, leaving #63 open on a strict subset of the same content. That fragments the milestone and adds no coverage.

Recorded consequence, for reviewer awareness: PR #63's title/description were T31-scoped (`ci: T31 Soravo wrapper milestone - security-audit ignore sync + baseline evidence`) and its diff now spans T31 + T32-A + T32-B. The PR title and body were updated to state the true scope. No commits were rewritten and nothing was force-pushed (v6 §14:5).

## 5. Whitespace decision (`:122` fixed; `PROGRESS.md` header hard breaks deliberately retained)

`git diff --check` on the T32 delta reported items. They were **not** equivalent.

**Fixed — `Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md:122`.** Genuine defect. Verified by byte comparison: HEAD ended `…task scope.\n` (2518 bytes, single terminator); the T32-A append left `…expectations\n\n` (2983 bytes, trailing blank line). Removed the extra blank line. Whitespace only; no content or behaviour change. This is the item named by T32-C §3 action 3 and T32-D item 1.

**Retained — `PROGRESS.md:4-5` and the `T32-A` report header.** T32-D instructs fixing the `PROGRESS.md:4` "nit". Doing so would have been wrong, and the decision is recorded rather than silently taken:

- `sed -n '1,8p' PROGRESS.md | cat -A` shows lines **3, 4, 5 and 6 all end with exactly two spaces**. The two trailing spaces are Markdown **hard line breaks** — the file's established blockquote rendering convention.
- `git diff --check` flags line 4 only because line 4 **changed**. Lines 3, 5 and 6 carry the identical trailing whitespace and are silently unflagged because they are unchanged. The finding is an artifact of the modified line, not a defect in the line.
- Stripping line 4 alone would break the blockquote's line-break rendering and make it inconsistent with its three immediate siblings.
- **Direct corroboration from the staged set itself.** Running the check across the whole staged diff (not just the working-tree delta) surfaces 7 hits in 2 files: `PROGRESS.md:4`, `PROGRESS.md:5`, and `T32-A-HANDY-V1-POLICY-RECONCILIATION-REPORT.md:3-7`. All 7 end in **exactly two** spaces; there are **zero** tabs and **zero** lines with 3+ trailing spaces. `T32-A` was authored inside this very milestone and independently used the same header convention. The pattern is therefore a **repository-wide convention in these report headers**, not a `PROGRESS.md` anomaly — which is decisive against stripping one line out of it.
- No CI job runs a whitespace check (`.github/workflows/ci.yml`, `security-audit.yml`, `pages-deployment.yaml`, `release.yml` inspected). This is not a gate.

Treated per v6 §01 conflict protocol: both the instruction and the contrary evidence are recorded; authority level applied; verified against the actual file bytes; no inference used. **Deviation from T32-D's literal instruction is deliberate and is listed for owner visibility in §7.**

## 6. File classification (every changed/untracked path, v6 §18 handoff schema)

**Staged (22 files, the T32 milestone):**

*Category 1 — T32-A (documentation reconciliation):*
- `M` `Soravo_Engineering_Docs_v6/02_PRODUCT_REQUIREMENTS.md`
- `M` `Soravo_Engineering_Docs_v6/04_HANDY_FORK_AND_REUSE_POLICY.md`
- `M` `Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md` — `:122` whitespace fix (this task)
- `M` `Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`
- `M` `Soravo_Engineering_Docs_v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`
- `A` `T32-A-HANDY-V1-POLICY-RECONCILIATION-REPORT.md`

*Category 2 — T32-B (payment-checkout hardening):*
- `A` `supabase/functions/payment-checkout/checkout.ts`
- `M` `supabase/functions/payment-checkout/index.ts`
- `A` `supabase/functions/payment-checkout/tsconfig.json`
- `A` `supabase/functions/payment-checkout/eslint.config.js`
- `A` `supabase/functions/payment-checkout/deno-shim.d.ts`
- `A` `supabase/functions/payment-checkout/package.json`
- `M` `supabase/tests/payment-checkout.test.mjs`
- `M` `supabase/config.toml`
- `M` `package.json`
- `M` `pnpm-lock.yaml`
- `A` `T32-B-PAYMENT-HARDENING-REPORT.md`

*Category 3 — audit/report (T32-C, T32-D):*
- `A` `T32-C-SORAVO-INFRASTRUCTURE-CLOSURE-AUDIT.md`
- `A` `T32-D-SORAVO-BLOCKER-REPORT.md`
- `A` `T32-D-SORAVO-BLOCKER-EXECUTION-MATRIX.md`

*Category 4 — milestone record:*
- `M` `PROGRESS.md` — `Last audited` → T32-E; `Main SHA` corrected; T32-E entry appended (this task)
- `A` `T32-E-MILESTONE-CHECKPOINT-REPORT.md` — this report (this task)

**Not staged — preserved in place, deliberately:**

*Category 5 — previous-milestone reports (T22–T31 convention: report files left untracked):*
`T22-MILESTONE-CHECKPOINT-REPORT.md`, `T23-BRANCH-PROTECTION-TASK.md`, `T23-GITHUB-BRANCH-PROTECTION-REPORT.md`, `T24-CI-FAILURE-ANALYSIS.md`, `T24-CI-RECVERY-REPORT.md`, `T27-HANDY-CORE-FREEZE-AND-BOUNDARY-REPORT.md`, `T28-CATALOG-AUTHORITY-REPORT.md`, `T29-HANDY-V1-PRESERVATION-POLICY-REPORT.md`, `T30-HANDY-V1-FAILURE-RECLASSIFICATION-REPORT.md`, `T31-SORAVO-WRAPPER-COMPLETION-REPORT.md`, plus `reports/`

*Category 6 — local environment / pre-existing non-T32 work:*
`apps/desktop/.env.example` (placeholders only, no secrets), `apps/desktop/src-tauri/tauri.toml` (mtime predates T32), `docs/archive/spec-v3/spec-v3/`

*Category 7 — generated local artifact:*
`deno.lock` (mtime 2026-09-28 21:43 +0530, predates T32-B work; root-level Deno lock, not a T32 artefact)

**No unclassified/unknown files.** Every path in `git status --short` at checkpoint time is accounted for in exactly one category above. No file was reset, stashed, discarded, or restored (v6 §18:11).

## 7. Deviations, findings, and unchanged blockers

### 7.1 Deviations from the T32-D T32-E instruction (owner visibility)

| # | T32-D said | Done | Why |
|---|---|---|---|
| 1 | Commit to `t31/soravo-wrapper-completion` so PR #63 CI covers the delta | **Done, as specified** | — |
| 2 | Fix `:122` blank line | **Done** | Genuine defect (§5) |
| 3 | Fix `PROGRESS.md:4` trailing whitespace | **Not done — retained with evidence** | Markdown hard break; `PROGRESS.md` lines 3/5/6 identical; same convention in the `T32-A` report header; stripping breaks rendering (§5) |
| 4 | (not specified) | `PROGRESS.md` `Main SHA` updated `549eeeec…` → `ede495b5…` | v6 §19 state audit must report the real `origin/main`. The prior value was `HISTORICAL/STALE` per v6 §01 evidence vocabulary. Without this the header would contradict this report. |

### 7.2 New findings raised by this checkpoint

| # | Finding | Severity | Status |
|---|---|---|---|
| F-E1 | `parseJWTClaims` uses `atob()` (base64) on a base64url JWT segment; bounded false-rejection window for non-ASCII claims with lead bytes `>= 0xE0` (U+1000+/emoji). Fail-closed; pre-existing at HEAD; not a T32 regression | LOW (availability) | **Open — follow-up task required.** No in-repo contract specifies base64url handling; v6 §00 forbids inferring it. Needs an owner/ADR decision, or a scoped task using `Uint8Array.fromBase64` / `-`/`_` normalisation |
| F-E2 | `PROGRESS.md:4-8` header still declares `**Authority:** SORAVO_PLAN.md, docs/spec-v3/`, which contradicts `SPEC_MANIFEST.json` + the v6 pack (v6 §00:53-56 says those are historical and must not override the pack). Actively misleading to a new agent | MEDIUM (documentation/control) | **Open — deliberately not changed here.** Authority declaration sits at v6 §01 authority-ladder level 2 (the pack's own non-negotiable controls), so it is an owner-level decision, not a checkpoint edit. Recommend it be the first line of the next documentation task |

### 7.3 Blockers unchanged by this task (all external/owner-gated)

- T30 catalog 10-item checklist; T30 transcription A/B/C (rust CI stays red **by design** — D17)
- ADR-018 approval
- `RAZORPAY_PLAN_SORAVO_MONTHLY_{INR,USD,CAD,EUR,AUD}` values; `RAZORPAY_WEBHOOK_SECRET`; Supabase deploy auth
- Razorpay merchant international-payments enablement
- Cloudflare credentials + first deployment; Supabase CLI auth
- Windows/macOS signing keys; updater endpoints/pubkey
- Branch-protection ruleset; release-workflow exercise

## 8. CI

Coverage for this checkpoint is provided by **PR #63** (required per T32-D item 1). Per-task instructions were to wait for the required CI, inspect the actual failure if it fails, and record PR/CI state.

Pre-existing baseline at the parent commit `648d110d`: `CI` `36509157391` = FAILURE (rust job, exactly the 15 STOP-gated tests), `Security Audit` `36509157409` = SUCCESS.

The post-push run IDs and conclusions are recorded on **PR #63** rather than in this commit, to keep the T32 milestone a **single coherent commit** as instructed. They are also restated in §1 for the parent's baseline.

**Expected outcome, stated before observation:** the `rust` job will fail again for the same 15 STOP-gated tests (D17, human-gated, unchanged by this checkpoint); `web`, `desktop`, `e2e` and `Security Audit` should pass. The `web`/`lint` job now additionally executes `lint:checkout` and `typecheck:checkout` because root `package.json` extends both scripts — that is the mechanism by which the T32-B delta gains CI coverage (T32-C §6 / T32-D D12 coverage halves).

**If the rust job fails on any test beyond those 15, that is a new failure and must be triaged as class A (code) per v6 §14:17 before this milestone can be called complete.** That triage is out of scope for this task's single-commit mandate and is explicitly handed to the next task.

## 9. Completion schema (v6 §09)

- **Changed files:** 22 staged, listed in §6. Of those, 2 modified by this task: `Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md` (whitespace only) and `PROGRESS.md` (header + this entry). The remaining 20 were authored by T32-A/B/C/D and are staged unchanged from those tasks.
- **Created files:** `T32-E-MILESTONE-CHECKPOINT-REPORT.md` (this report); 6 new T32-B function files + 5 T32-A/B/C/D reports.
- **Updated files:** `PROGRESS.md`.
- **Unchanged relevant files:** `T16-FINAL-COMPLETION-MATRIX.md` (authoritative baseline, not modified); all `crates/`, `apps/desktop` source, `services/`, `packages/` sources; all migrations; `supabase/functions/razorpay-webhook/**`; all CI workflows; all prior T-reports.
- **Tests:** `pnpm test:supabase` 200/200; `pnpm lint` PASS; `pnpm typecheck` PASS; `pnpm install --frozen-lockfile --lockfile-only` PASS; two secret scans 0 findings.
- **Security:** no secret value read, printed, or committed. TEST mode preserved. LIVE never entered. Server-authoritative pricing and RLS boundaries unchanged. The `atob` residual (§2.1) is fail-closed and recorded.
- **CI:** see §8. **Deployment:** none. **External config:** none. **Provider mutations:** none.
- **Commit/push:** one commit pushed to `t31/soravo-wrapper-completion`, updating PR #63. No force-push, no history rewrite (v6 §14:5). **No merge.**

## 10. Next exact task

**T32-P — IPC round-trip verification (AI, no external input; D16).** Per T32-D this is the first fully AI-executable row — the only row in the 16-row matrix whose sole gap is missing verification evidence.

- `apps/desktop/src-tauri/src/commands/soravo_ipc.rs`
- `apps/desktop/src-tauri/src/session.rs` (authoritative session machine)
- One runtime round-trip: `session_snapshot` → `session_transition` (valid + invalid transition) → `inject_text` (valid + oversize rejection)
- Assert state transitions and typed errors per v6 §05 invariants (session IDs mandatory; stale results rejected; transitions validated)
- Prerequisite met: T32-E is the commit task T32-D sequenced ahead of it.

Do not repeat: T32-E is complete — T32-A and T32-B are committed and CI-covered; do not re-commit them, and do not reopen the T30 transcription dispute or the model-catalog checklist.

---

*Report: T32-E — Authority: `SPEC_MANIFEST.json` + v6 §00–§21 + T16 matrix + T29/T30/T31/T32-A/T32-B/T32-C/T32-D + live git/PR/CI evidence gathered 2026-09-29 on `t31/soravo-wrapper-completion` @ `648d110d`. Single coherent commit; PR #63 updated; not merged. Handy core untouched. T30 dispute not reopened. No fabricated evidence.*
