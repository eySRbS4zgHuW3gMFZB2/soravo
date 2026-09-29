# T32-D — SORAVO BLOCKER DECISION + EXECUTION PLAN REPORT

**Date:** 2026-09-29
**Task:** T32-D — Soravo blocker decision + execution plan (DECISION ONLY)
**Status:** DECISION COMPLETE — STOP (no implementation, no commit, no push)
**Branch:** `t31/soravo-wrapper-completion`
**HEAD:** `648d110d286b81a8a0ce1d203f7a5407936ebc51`
**origin/main:** `ede495b55efd95cedd882d90a19d12b4777da852`
**Companion file:** `T32-D-SORAVO-BLOCKER-EXECUTION-MATRIX.md` (the deterministic blocker list; this report is the rationale + audit trail)

---

## 1. OBJECTIVE (as tasked)

Turn the T32-C closure audit (20 domains: 4 IMPLEMENTED_VERIFIED, 1 IMPLEMENTED_UNVERIFIED, 12 PARTIAL, 3 BLOCKED, 0 PRODUCTION_VERIFIED) into a deterministic blocker list: for every PARTIAL/BLOCKED domain determine A (completable from documented facts?) through F (merely missing verification?), and implement nothing whose required input is unavailable.

## 2. READING GATE — COMPLETED

1. `SPEC_MANIFEST.json` read (v2 manifest; authority set = listed docs).
2. Every authoritative document in manifest order + v6 control pack (§00–§21, DESIGN skimmed, manifest) — key anchors re-verified: §05:35-36 (entitlement cache needs an "explicit offline policy" that does not exist), §06:8-24 (checkout/webhook/entitlement semantics — the cancelled-vs-expiry contract), §15 (TEST-only), §09/§12 (fabrication prohibitions, mirror trust anchor).
3. `PROGRESS.md` read in full (lines 1–2036, through T32-C entry).
4. Current completion matrix read: `T16-FINAL-COMPLETION-MATRIX.md` (22 domains; explicitly NOT modified by this task).
5. `T29-HANDY-V1-PRESERVATION-POLICY-REPORT.md`, `T30-HANDY-V1-FAILURE-RECLASSIFICATION-REPORT.md`, `T31-SORAVO-WRAPPER-COMPLETION-REPORT.md`, `T32-A-HANDY-V1-POLICY-RECONCILIATION-REPORT.md`, `T32-B-PAYMENT-HARDENING-REPORT.md`, `T32-C-SORAVO-INFRASTRUCTURE-CLOSURE-AUDIT.md` — all read.
6. Live git/PR/CI inspected: dirty worktree (T32-A doc delta + T32-B checkout hardening uncommitted, in neither PR, covered by no CI run); PR #63 OPEN (T31 commit `648d110d` only); PR #62 OPEN (other milestone); CI 36509157391 FAILURE = exactly the 15 STOP-gated tests (byte-identical T28/T30), Security Audit 36509157409 SUCCESS.
7. Relevant reports re-read before deciding (T30 §2/§4/§5 for catalog + transcription gates; T32-B §2/§6 for checkout defects + deliberately deferred `service.ts:205`; 025/026/027 via PROGRESS for credential-revocation, captured-flag, and merchant-account findings).

## 3. GLOBAL V1 RULE — HONOURED

Soravo is a wrapper/platform around the functioning Handy-derived core. This task modified no Handy STT behaviour, added no transcription post-processing, touched no audio/VAD/engine code, altered no language detection, modified no filler removal, rewrote no normalization, and redesigned no UI. The Handy core is not a T32-D workstream. The T30 transcription dispute is not reopened (classifications recorded as-is; §7 below is a decision routing, not a re-litigation).

## 4. SPECIAL HANDLING — DECISIONS

### 4.1 Model catalog — stays BLOCKED, evidence specified exactly

`catalog.json` re-verified `{}` (schema-invalid, requires `models[]`). The 10 catalog tests fail on the single Lazy-poison root cause (`catalog/mod.rs:119`). No ID, hash, mirror, license, or set invented. Matrix row D9 carries the exact 10-item evidence checklist (T30 §5 nine items + transcription product call): approved set, source org/host, per-model license verdict + text (ADR-011), revision pins, byte-exact sizes/hashes computed from pinned artifacts (never hand-written), arch reconciliation with `KNOWN_ARCHES`, mirror URLs with untrusted-transport acknowledgment, a real generator procedure (`gen_catalog.py` never existed — must be created), chain-of-custody manifest per v6 §21. Owner: Human (+ upstream hosts for hash computation). Next: T32-I, only after T32-K evidences every item.

### 4.2 Updater — exact missing configuration, nothing invented

One `updater` reference in `main.rs` (plugin init); zero in `tauri.conf.json` (grep this session). Missing: `plugins.updater` endpoints (real update-server URL) + `pubkey` (real signing public key) + hosted update server + staged-update test. No endpoint, key, pubkey, or release URL invented. Owner: Human (channel + custody) + External (keypair, hosting). Next: T32-L.

### 4.3 Cloudflare — deployment evidence required, nothing deployed or fabricated

Workflow file exists; zero deployment executions (unanimous across audits, uncontradicted). Required: Cloudflare credentials + Pages project, then a real first-deployment execution (run URL/ID, deployment URL, logs). Agent deploys nothing. Owner: Human + External. Next: T32-M.

### 4.4 Payment (T32-B review) — what remains external-gated

T32-B's 7 findings are accepted as fixed-locally (22 real checkout tests, mutation-killed import defect, TEST-gate, fail-closed plan resolution, Deno-safe base64, Auth-API identity, explicit `verify_jwt = true`). What remains external-gated: (a) real TEST Plan IDs — `RAZORPAY_PLAN_SORAVO_MONTHLY_{INR,USD,CAD,EUR,AUD}` values unknown (human Dashboard creation; fabrication refused in checkout 503 and recorded-but-untouched `service.ts:205`); (b) credentials — TEST keypair (025 proved server-side revocation; fresh pair is an owner action), `RAZORPAY_WEBHOOK_SECRET` empty locally / write-only in Supabase; (c) signing secrets — Supabase function secret store (unlistable without `SUPABASE_ACCESS_TOKEN`); (d) live/test provider verification — non-INR settlement blocked by merchant domestic-cards-only config (027-C), subscription lifecycle never exercised with real Plans, no validly-signed replay ever injected (027 limitation); (e) production deployment — payment-checkout undeployed (pre-hardening version live), no deployed-checkout replay. Owner: Human + External. Next: T32-G (deploy + replay) + T32-H (Plans + lifecycle + parity).

### 4.5 Desktop entitlements — contract INSUFFICIENT, decision classified

v6 §05:36 promises cache "bounded/tamper-evident according to explicit offline policy" — but no such offline-policy document exists (repo-wide grep: only §03's name-drop and §05:36 itself). Therefore implementation is NOT authorized: missing decision = explicit offline policy (max TTL, cache bounds, signature/key scheme, tamper-evidence mechanism, clock-skew handling). Matrix row D7 records Owner: Human, Can execute now: NO. Next: T32-Q (policy decision first, implementation after). The entitlement *reader* ranking itself (022) is proven in isolation; the gap is persistence + policy + E2E display.

### 4.6 T30 transcription tests — not reopened, not modified

The 5 tests stay red by design until the human selects T30 §4 Option A (freeze expectations + annotate), B (ignored deferred module + tracker), C (remove + spec task), or rejects all. Any code-side "fix" would violate 5 explicit T30 prohibitions; any test-side edit pre-decision would violate the STOP rule. Matrix row D17 routes the decision only. Owner: Human. Next: T32-K.

## 5. WHAT IS (AND IS NOT) EXECUTABLE NOW

- **Exactly one row is fully AI-executable with zero external input: D16 (Soravo IPC round-trip verification).** All inputs are in-repo (session machine + `soravo_ipc.rs` + ladder-test patterns); v6 §05 specifies the contracts; CI already compiles the target. It is still NOT implemented by T32-D (STOP after matrix/report) — it is proposed as T32-P, first implementation task after the commit task.
- **Three rows have AI-executable halves, all deferred to their own tasks:** D4/D12 commit + CI coverage (mechanically ready — files exist, suites green locally — but forbidden by this task's no-commit STOP → T32-E, including the `:122` whitespace nit); D13-item-1 webhook Deno-aware lint/type coverage (no external input → T32-J); D3-1 cancelled-vs-expiry alignment (contract exists in v6 §06:22 + ADR-012, but T32-C explicitly requires its own product task → T32-F after owner ratification).
- **Everything else is NO:** 9 rows need a Human/product decision, 10 need External Provider/dashboard/credential action, 3 need Windows/macOS hardware, 1 (D9) needs authoritative model/catalog data. The single pure-verification gap is D16; all other PARTIALs are missing features, decisions, or external objects — not just evidence.
- **No source change was made by T32-D.** The "unless conclusively executable" clause authorizes nothing here because every executable item belongs to a sequenced next task (commit gating, CI coverage, ratification) rather than to a decision task that must stay read-only and uncommitted.

## 6. ORDERED PLAN (from the matrix; owner-gated where marked)

T32-E commit (owner-approved, fixes `:122`, PR #63 CI) → T32-P IPC verification (AI) → T32-F cancelled alignment (after ratification) → T32-J webhook lint coverage (AI) → [Owner] T32-K transcription/catalog/ADR-018 → [Owner] T32-I catalog population (only fully evidenced) → [Owner+Supabase] T32-G checkout deploy + replay → [Owner] T32-H Plans/lifecycle/parity/trim → [Owner] T32-O account round-trips → [Owner] T32-Q offline policy → [Owner] T32-R sync scope → [Owner] T32-M Cloudflare → [Owner] T32-L updater → [Owner] T32-N packaging → [Owner] T32-S protection/release. No LIVE mode until 1–15 evidence exists.

## 7. COMPLETION SCHEMA (v6 §09)

- **Changed files:** NONE (decision only; worktree source/config/test/migration/function files untouched).
- **Created files:** `T32-D-SORAVO-BLOCKER-EXECUTION-MATRIX.md`, `T32-D-SORAVO-BLOCKER-REPORT.md` (this report).
- **Updated file:** `PROGRESS.md` (T32-D entry only + Last-audited header; completion matrix untouched).
- **Commands (read-only):** `git status --short --branch`, `git rev-parse HEAD`, `git log --oneline -10`, `git diff --check`, `gh pr list --state open`, `gh run list --limit 8`; file reads (`catalog.json`, `soravo_ipc` dir listing, `supabase/functions/`, `.github/workflows/`); greps (`updater` in `src-tauri`, `plan_` in `license-api/src/payment`, offline/entitlement + plan/ADR-012 in v6 pack); full reads (SPEC_MANIFEST, PROGRESS.md 1–2036, T16 matrix, T29/T30/T31/T32-A/T32-B/T32-C, v6 §05/§06).
- **Tests:** none executed (decision mandate; all figures cited from T30/T31/T32-B reports and CI runs 36509157391/36509157409).
- **Security:** no secrets touched, printed, or committed; no credential inspected beyond shape/provenance already recorded in 025/027.
- **CI / Deployment / External config:** observed only; none performed.
- **Unchanged relevant files:** all source, test, config, migration, function, workflow files; all prior T-reports; `T16-FINAL-COMPLETION-MATRIX.md` explicitly unmodified.
- **Blockers carried, not resolved:** T30 catalog checklist + transcription A/B/C; ADR-018 approval; T32-B commit/deploy; `RAZORPAY_PLAN_SORAVO_MONTHLY_*`; webhook 53→8 trim; `subscription.cancelled` vs ADR-012; Cloudflare creds; signing keys; updater endpoints/pubkey; Supabase deploy auth; merchant international enablement.
- **Commit/push:** none (per STOP instruction).

**STOP. Decision complete. No commit or push performed. No production source modified. Completion matrix not modified. T30 dispute not reopened. Handy STT pipeline not classified as Soravo work.**

---

*Report: T32-D — Author: T32-D decision session — Authority: Soravo v6 engineering control pack + T29/T30/T31/T32-A/T32-B/T32-C + T16 matrix + primary git/PR/CI/file evidence gathered 2026-09-29 on branch `t31/soravo-wrapper-completion` @ `648d110d`.*
