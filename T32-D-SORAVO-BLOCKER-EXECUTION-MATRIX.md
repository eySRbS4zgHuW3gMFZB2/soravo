# T32-D — SORAVO BLOCKER EXECUTION MATRIX (Deterministic)

**Date:** 2026-09-29
**Task:** T32-D — Soravo blocker decision + execution plan (DECISION ONLY)
**Status:** DECISION COMPLETE — NO SOURCE MODIFIED BY THIS TASK
**Branch (decision ref):** `t31/soravo-wrapper-completion`
**HEAD (decision ref):** `648d110d286b81a8a0ce1d203f7a5407936ebc51`
**origin/main:** `ede495b55efd95cedd882d90a19d12b4777da852`
**Authority:** T32-C closure audit (§1–§3) + T16 matrix (baseline, unmodified) + T29/T30/T31/T32-A/T32-B + v6 pack (§05 entitlements, §06 payment, §15 secrets)
**V1 rule honoured:** Handy STT/audio/VAD/engine/language/filler/normalization behaviour untouched. No transcription test modified.
**Commit/push:** none (per instruction).

## Reading gate (completed)

1. `SPEC_MANIFEST.json` — v2 manifest read.
2. Authoritative docs in manifest order + v6 control pack (§00–§21, DESIGN skimmed, manifest) — read per T32-C §0; re-verified §05:35-36 (entitlement cache), §06:8-24 (checkout/webhook/entitlement semantics), §15 (TEST-only), plus live files below.
3. `PROGRESS.md` — read in full (lines 1–2036, through T32-C entry).
4. Current completion matrix — `T16-FINAL-COMPLETION-MATRIX.md` (22 domains, authoritative baseline, NOT modified).
5. `T29-HANDY-V1-PRESERVATION-POLICY-REPORT.md`, `T30-HANDY-V1-FAILURE-RECLASSIFICATION-REPORT.md`, `T31-SORAVO-WRAPPER-COMPLETION-REPORT.md`, `T32-A-HANDY-V1-POLICY-RECONCILIATION-REPORT.md`, `T32-B-PAYMENT-HARDENING-REPORT.md`, `T32-C-SORAVO-INFRASTRUCTURE-CLOSURE-AUDIT.md` — all read.
6. Live git/PR/CI inspected this session: branch `t31/soravo-wrapper-completion` @ `648d110d`; `git status` dirty (T32-A doc delta + T32-B checkout hardening uncommitted, see T32-C §1); PR #63 OPEN (T31 commit only), PR #62 OPEN (other milestone); CI run 36509157391 FAILURE = exactly the 15 STOP-gated Rust tests, run 36509157409 Security Audit SUCCESS.
7. Live file re-verification this session: `catalog.json` = `{}` (3 bytes, schema-invalid); `updater` grep — 1 match in `main.rs` (plugin init), 0 in `tauri.conf.json` (no endpoints/pubkey); `service.ts:205` still fabricates ``plan_${product.id}_${currency}``; `supabase/functions/payment-checkout/` = 6 files (T32-B worktree-only); `.github/workflows/` = ci/security-audit/pages-deployment/release.

## Decision vocabulary

- **Owner AI** — executable by an agent from in-repo contracts alone (no human, provider, or hardware input).
- **Owner Human** — requires a product/owner decision (choice, approval, or policy text).
- **Owner External Provider** — requires a provider/dashboard/credential/secret action (Razorpay, Supabase, Cloudflare, Apple/Microsoft).
- **Owner Hardware** — requires Windows/macOS hardware or OS-native build/sign/notarize execution.
- **Can execute now: YES** — all required inputs exist in-repo AND no commit/push/deploy is needed to decide (execution itself belongs to the proposed next task; T32-D implements nothing per STOP).
- **Can execute now: NO** — at least one required input is unavailable.

---

## Matrix (16 remaining rows: 12× PARTIAL + 3× BLOCKED + 1× IMPLEMENTED_UNVERIFIED)

### D1 — Accounts / auth — PARTIAL (T32-C §2.1)

- **Evidence:** `apps/desktop/src-tauri/src/account.rs`, `commands/account.rs` (sign_in_start/complete, sign_out, device/session, refresh); website `/login`, `/account`, `/reset-password` (no `/signup` on either client — 021, T32-C §2.1).
- **A–F:** A: NO (signup scope + live proof unavailable in-repo). B: YES (`/signup` route scope is a product decision). C: YES (live sign-in round-trip needs Supabase project access). D: NO. E: NO. F: YES (no auth-flow execution evidence; offline `Unavailable` path untested).
- **Exact missing requirement:** (1) Product decision: is `/signup` in V1 scope for desktop + web, or login-only? (2) Execution evidence: one sign-in round-trip proof + offline-`Unavailable` path test (needs Supabase access + runnable app).
- **Owner:** Human (decision) + External Provider (Supabase access) → then AI (test).
- **Can execute now:** NO.
- **Required prerequisite:** Owner answers signup-scope question; owner grants/authorizes Supabase TEST access.
- **Proposed next task ID:** T32-O (desktop account/entitlement/cloud-sync round-trip verification, includes D1+D6+D7+D8 evidence).

### D2 — Sessions / devices — PARTIAL (T32-C §2.4)

- **Evidence:** `session.rs` state machine + 13 ladder tests passing (T10-B/T31); migration `20260915160000_establish_devices_and_sessions.sql` on main. Absence: 027 smoke created zero device/session/profile rows; cross-client sync unverified (021).
- **A–F:** A: NO (device/cloud half has no execution proof and needs live Supabase). B: NO (contract exists; no product choice open). C: YES (Supabase write access for device/session rows). D: NO. E: NO. F: YES (purely missing execution evidence on the device half; session logic already proven locally).
- **Exact missing requirement:** One executed device-register + session-create + cross-client-read round-trip against Supabase TEST, with row IDs recorded.
- **Owner:** External Provider (Supabase access) → then AI.
- **Can execute now:** NO.
- **Required prerequisite:** Supabase TEST access authorized.
- **Proposed next task ID:** T32-O (same round-trip task as D1).

### D3 — Entitlements (server) — PARTIAL (T32-C §2.5)

- **Evidence (live, TEST):** 027 lifetime grant for TEST user `a5a2ae69-…` (`active`, `expires_at=NULL`, order+payment refs match); `entitlements_one_current_per_user_product UNIQUE` confirmed live (024). Absence: subscription lifecycle never exercised with real objects; no offline cache persistence.
- **A–F:** A: PARTIAL (cancelled-vs-expiry alignment is contract-available — see below; lifecycle execution is not). B: YES-recorded (T32-C: `subscription.cancelled` → immediate revocation contradicts ADR-012/v6 §06:22 "monthly may be cancelled while remaining valid through expiry" — needs its own product task to ratify the fix). C: YES (real TEST Plans/Subscriptions + merchant-account state for lifecycle). D: NO. E: NO. F: YES (charged/cancelled/halted/paused/resumed never exercised against real objects).
- **Exact missing requirement:** (1) Ratify-and-fix cancelled-vs-expiry (contract exists in v6 §06:22; implement as separate task with tests). (2) Real Razorpay TEST Plan + Subscription objects + one lifecycle pass (charge → pause/resume → cancel → refund) with ledger/entitlement row evidence.
- **Owner:** Human (ratify D3-1; create Dashboard objects for D3-2) + External Provider (Razorpay TEST objects) → AI implements.
- **Can execute now:** NO (D3-1 is contract-ready but belongs to its own task per T32-C carry-forward; D3-2 needs Dashboard objects).
- **Required prerequisite:** Owner ratification of expiry-through-period semantics; owner-created TEST Plan/Subscription.
- **Proposed next task ID:** T32-F (cancelled-vs-ADR-012 alignment, contract-ready) then T32-H (TEST lifecycle with real objects).

### D4 — Payment checkout (function) — PARTIAL (T32-C §2.6)

- **Evidence (worktree only):** T32-B `checkout.ts` new + `index.ts` thin wiring + tsconfig/eslint + `lint:checkout`/`typecheck:checkout`; `pnpm test:supabase` 200/200 locally (22 checkout, mocked fetch). Absence: entire delta uncommitted (no PR, no CI); deployed function is pre-hardening; `RAZORPAY_PLAN_SORAVO_MONTHLY_*` values unknown; no deployed-checkout replay.
- **A–F:** A: YES for the commit/CI half (mechanical: files exist, tests green locally). B: NO (plan-ID values are deployment config, not a product choice — but values are unknown). C: YES (Supabase deploy auth + Dashboard plan creation + TEST secrets for the deploy half). D: NO. E: NO. F: YES (deployed-checkout replay: one TEST lifetime + one TEST monthly).
- **Exact missing requirement:** (1) Commit T32-A docs + T32-B hardening to `t31/soravo-wrapper-completion` (fix the `:122` blank-line nit + `PROGRESS.md:4` trailing-whitespace nit in same pass) so PR #63 CI covers them. (2) Supabase deploy auth + `RAZORPAY_PLAN_SORAVO_MONTHLY_{INR,USD,CAD,EUR,AUD}` values from human-created TEST Plans + `RAZORPAY_WEBHOOK_SECRET` set. (3) Deployed replay evidence (lifetime + monthly checkout responses + Razorpay payload assertions).
- **Owner:** AI (commit-ready) → Human + External Provider (Supabase access, Dashboard Plans, secrets).
- **Can execute now:** NO (commit half is mechanically ready but forbidden by this task's no-commit STOP; deploy half needs external inputs).
- **Required prerequisite:** Owner approval to commit; then Supabase access + real TEST Plan IDs + secrets.
- **Proposed next task ID:** T32-E (commit T32-A/T32-B + CI green) then T32-G (deploy payment-checkout + TEST replay).

### D5 — License API — PARTIAL (T32-C §2.9)

- **Evidence:** 71/71 unit + regional pricing 5 currencies (028) + subscription methods (029); live TEST orders created via `RazorpayProvider` for all 5 amounts (029); 027 INR lifetime settled end-to-end. Absence: non-INR settlement blocked by merchant-account domestic-cards-only config (027-C); subscription lifecycle never exercised with real Plans; `service.ts:205` fabricates ``plan_<product>_<currency>`` (same class T32-B refused to invent in checkout).
- **A–F:** A: NO (real plan IDs + merchant enablement unavailable in-repo). B: YES (adopt real Razorpay Plan IDs for monthly — the same product decision as checkout; merchant international-cards enablement is a business decision). C: YES (Razorpay Dashboard Plans + merchant-account international enablement). D: NO. E: NO. F: YES (subscription lifecycle with real Plans; non-INR settle proof).
- **Exact missing requirement:** (1) Product decision: real Plan-ID set for `soravo_monthly` × 5 currencies (values, not a pattern). (2) Align `service.ts:205` to those IDs (fail-closed when unset, mirroring checkout). (3) Merchant-account international-payments enablement (or documented INR-only scope decision). (4) Subscription lifecycle execution with real Plans.
- **Owner:** Human (decision + Dashboard Plans) + External Provider (Razorpay account config).
- **Can execute now:** NO.
- **Required prerequisite:** Real TEST Plan IDs + merchant-account decision.
- **Proposed next task ID:** T32-H (real TEST Plans + license-api parity + lifecycle; shared with D3-2).

### D6 — Desktop account integration — PARTIAL (T32-C §2.11)

- **Evidence:** PKCE, token storage, account state, device/session mgmt, cached snapshot (`account.rs`, `commands/account.rs`); `AccountPanel` mounted. Absence: no sign-in round-trip; offline `Unavailable` untested; 022 reader fix (`product=in.(monthly,lifetime)` + `select_primary_entitlement`) proven in isolated harness only (crate has pre-existing unrelated errors).
- **A–F:** A: NO. B: NO (no new product choice; contract exists). C: YES (Supabase TEST access for live rows). D: PARTIAL (desktop run needs a buildable OS env; packaging needs Windows/macOS — verification itself can run on Linux). E: NO. F: YES (round-trip + offline-path evidence).
- **Exact missing requirement:** Sign-in round-trip execution + entitlement-reader read of a live row from the desktop side + offline-`Unavailable` path test.
- **Owner:** External Provider (Supabase access) → AI.
- **Can execute now:** NO.
- **Required prerequisite:** Supabase TEST access + buildable desktop target.
- **Proposed next task ID:** T32-O (round-trip verification).

### D7 — Desktop entitlement integration — PARTIAL (T32-C §2.12)

- **Evidence:** `select_primary_entitlement` ranking + `#[serde(default)]` on `active` (022, isolated 9-test harness). Absence: no E2E desktop display of a live entitlement; subscription-lifecycle rows never produced; offline cache persistence absent (T16 domain 9).
- **A–F:** A: NO (offline-cache contract insufficient — see D17 special handling below; live rows unavailable). B: YES (offline policy: TTL/bounds/signing/tamper-evidence scheme — v6 §05:36 cites an "explicit offline policy" that does not exist as a document). C: YES (live lifecycle rows). D: PARTIAL (as D6). E: NO. F: YES (E2E display evidence).
- **Exact missing requirement:** (1) Human/product decision: explicit offline entitlement policy (max TTL, cache bounds, signature/key scheme, tamper-evidence mechanism, clock-skew handling). (2) Live lifecycle rows to consume. (3) E2E display proof.
- **Owner:** Human (offline-policy decision) + External Provider (live rows).
- **Can execute now:** NO.
- **Required prerequisite:** Explicit offline-policy document approved; then live rows.
- **Proposed next task ID:** T32-Q (offline-policy decision → implementation + E2E; see report §5).

### D8 — Cloud synchronization — PARTIAL (T32-C §2.13)

- **Evidence:** Device/session record plumbing via Supabase REST present. Absence: no transcript sync, no conflict resolution (T15 §14, T16 domain 8, unchanged); zero sync execution evidence.
- **A–F:** A: NO. B: YES (is transcript sync + conflict resolution V1 scope? No v6 contract defines transcript-sync semantics — product decision required before any implementation). C: NO (beyond the access already needed elsewhere). D: NO. E: NO. F: NO (feature does not exist; not a verification gap).
- **Exact missing requirement:** Product decision: V1 sync scope (records-only vs transcript-sync + conflict-resolution contract). If transcript sync is V1, a sync-semantics spec must be authored first.
- **Owner:** Human.
- **Can execute now:** NO.
- **Required prerequisite:** V1 sync-scope decision (+ spec if transcript sync is in).
- **Proposed next task ID:** T32-R (sync-scope decision; implementation only if scoped in with a spec).

### D9 — Model catalog policy — BLOCKED (T32-C §2.10)

- **Evidence:** `catalog.json` re-verified `{}` (schema-invalid, requires `models[]`); 10 catalog tests fail on the single Lazy-poison root cause (`missing field 'models'` at `catalog/mod.rs:119`, T30 §2.1, unchanged since T28).
- **A–F:** A: NO. B: YES (model set + source org + license verdicts + pins + mirrors + generator procedure + chain-of-custody — owner decisions). C: PARTIAL (upstream hosts for hash/size computation once pins are chosen). D: NO. E: YES (authoritative model/catalog data — the blocking input). F: NO (not a verification gap; data is absent).
- **Exact missing requirement (fabrication prohibited — v6 §09, T30 STOP):** the T30 §5 9-item checklist + transcription product call: (1) approved model SET, (2) approved source org/host per model, (3) per-model license verdict + license text/source (ADR-011 gate), (4) revision pin (commit SHA) per model, (5) byte-exact `size_bytes` + SHA-256 computed from pinned artifacts (never hand-written), (6) arch/capability values reconciled with `KNOWN_ARCHES`, (7) approved mirror base URLs (untrusted-transport acknowledgment), (8) approved generator procedure (`gen_catalog.py` equivalent — never existed, must be created), (9) chain-of-custody manifest per v6 §21, (10) filler-gating/normalization/language-detection product call (gates transcription options).
- **Owner:** Human (all 10) + External Provider (upstream artifact hosts for hash computation).
- **Can execute now:** NO.
- **Required prerequisite:** All checklist items evidenced; hashes computed from pinned artifacts.
- **Proposed next task ID:** T32-I (catalog authority + population; executes only after checklist evidenced).

### D10 — Updater infrastructure — BLOCKED (T32-C §2.14)

- **Evidence:** `tauri-plugin-updater` initialised in `main.rs` (1 `updater` match); `tauri.conf.json` contains zero `updater` references (no `plugins.updater` endpoints/pubkey — re-confirmed by grep this session); no update server; no staged-update test.
- **A–F:** A: NO (endpoints/keys/server cannot be derived from repo). B: YES (release-channel decision: update server choice + signing-key custody). C: YES (signing keypair generation + update-artifact hosting endpoint + pubkey distribution). D: PARTIAL (staged-update test needs OS targets). E: NO. F: NO.
- **Exact missing requirement (no invention — endpoints, signing keys, pubkeys, release URLs must not be fabricated):** (1) `tauri.conf.json` `plugins.updater` endpoints (update-server URL) + `pubkey` (signing public key) — real values from owner-generated keypair + hosted server. (2) Update server/hosting location + release-artifact pipeline. (3) Staged-update test evidence (old→new transition proof).
- **Owner:** Human (channel + custody decision) + External Provider (keypair, hosting, endpoint).
- **Can execute now:** NO.
- **Required prerequisite:** Owner-generated signing keypair + hosted update endpoint + pubkey value.
- **Proposed next task ID:** T32-L (updater channel: keys + endpoints + staged test).

### D11 — Cloudflare deployment — BLOCKED (T32-C §2.15)

- **Evidence:** `.github/workflows/pages-deployment.yaml` exists (least-privilege secrets, conditional skip). Absence: zero deployment executions (unanimous T08/T11/T13–T15/T16/T32-C).
- **A–F:** A: NO. B: NO (no product choice; hosting established unless ADR changes it — v6 §06:2). C: YES (Cloudflare credentials + Pages project + secrets). D: NO. E: NO. F: NO (nothing deployed to verify; this is an execution gap, not a verification-only gap).
- **Exact missing requirement (no deployment or fabricated evidence by agent):** (1) Cloudflare credentials + Pages project configured. (2) First real deployment execution with run URL/ID + deployment URL + logs. (3) Supabase CLI auth for related function deploys (027-B still open).
- **Owner:** Human + External Provider (Cloudflare).
- **Can execute now:** NO.
- **Required prerequisite:** Cloudflare credentials + Pages project; owner-triggered first deploy.
- **Proposed next task ID:** T32-M (first Pages deployment + evidence).

### D12 — CI/CD — PARTIAL (T32-C §2.16)

- **Evidence (green):** Security Audit 36509157409 SUCCESS; CI 36509157391 web/desktop/e2e SUCCESS; e2e 20/20 baseline. **Evidence (red by design):** rust job FAILURE = exactly the 15 STOP-gated tests (byte-identical T28/T30/CI-162/run-36509157391). **Gaps:** T32-A/T32-B delta covered by no CI run (uncommitted); release workflow `workflow_dispatch`-only, signing commented out, never exercised; branch protection absent (404); `pages-deployment` deploys independent of CI.
- **A–F:** A: YES for commit+CI-coverage half (mechanical). B: YES for branch-protection ruleset + release/signing policy (owner decisions). C: YES for signing keys (external). D: NO. E: NO. F: YES for T32-B coverage + release-exercise evidence.
- **Exact missing requirement:** (1) Commit T32-A/T32-B so PR #63 CI covers them (same T32-E). (2) Owner branch-protection ruleset decision + enforcement. (3) Release-exercise evidence (dispatch run + signing-key wiring or documented unsigned scope). (4) T30 A/B/C + catalog checklist (unblocks rust job — human, see D15).
- **Owner:** AI (commit half) → Human (protection/signing decisions) + External Provider (signing keys).
- **Can execute now:** PARTIAL — commit half YES-but-deferred (STOP); protection/release half NO.
- **Required prerequisite:** T32-E commit; owner protection/signing decisions.
- **Proposed next task ID:** T32-E (coverage) then T32-S (protection + release exercise).

### D13 — Security checks — PARTIAL (T32-C §2.17)

- **Evidence (green):** cargo-audit/deny/npm-audit SUCCESS; CSP explicit; secret hygiene verified (025: `.env.local` gitignored/untracked/`chmod 600`, zero real-shaped tokens); T32-B asserts no secret substring in checkout responses.
- **A–F:** A: YES for webhook type/lint remainder (Deno-aware setup — agent-work from in-repo facts). B: YES for leaked-password protection enablement (T08 D3 — Supabase Auth setting, owner risk decision) + B2 unsafe-FFI ADR (pending). C: YES for webhook 53→8 trim (Dashboard) + leaked-password toggle (Dashboard). D: NO. E: NO. F: YES (post-change evidence for each).
- **Exact missing requirement:** (1) Webhook `razorpay-webhook/**` Deno-aware type/lint coverage (T16 F-09 remainder; esm.sh imports + unguarded `Deno.serve` — separate agent task, no external input). (2) Owner decision: enable leaked-password protection. (3) Dashboard trim 53→8 subscribed events (027-A). (4) B2 unsafe-FFI ADR resolution.
- **Owner:** AI (item 1) → Human + External Provider (items 2–4).
- **Can execute now:** PARTIAL — item 1 YES (as its own task); items 2–4 NO.
- **Required prerequisite:** None for item 1; owner/Dashboard actions for items 2–4.
- **Proposed next task ID:** T32-J (webhook lint/type coverage) for item 1; T32-H (Dashboard trim) + owner decisions for the rest.

### D14 — Windows packaging — PARTIAL (T32-C §2.18)

- **Evidence:** MSI+NSIS targets, installer icon, en-US/Wix config in `tauri.conf.json`. Absence: no `tauri build` execution evidence on Windows or CI.
- **A–F:** A: NO. B: NO (no product choice open). C: YES (Windows signing keys/certs). D: YES (Windows hardware or Windows CI runner + `tauri build` execution). E: NO. F: NO (nothing built to verify).
- **Exact missing requirement:** Windows signing identity + one executed `tauri build` (MSI/NSIS artifacts + checksums) on Windows hardware/runner.
- **Owner:** Human (signing identity) + Hardware + External Provider (cert).
- **Can execute now:** NO.
- **Required prerequisite:** Windows runner/hardware + signing cert.
- **Proposed next task ID:** T32-N (Windows+macOS packaging: signing + builds + notarization).

### D15 — macOS packaging — PARTIAL (T32-C §2.19)

- **Evidence:** DMG target, `Entitlements.plist`, icons present. Absence: no build/notarization evidence; app-ID registration outstanding; `NSMicrophoneUsageDescription` gap (T15 §4).
- **A–F:** A: NO. B: YES (microphone-usage description string is product copy; app-ID registration is an owner action). C: YES (Apple Developer ID + notarization credentials + app-ID registration). D: YES (macOS hardware + `tauri build` + notarization). E: NO. F: NO.
- **Exact missing requirement:** (1) Product copy: `NSMicrophoneUsageDescription` string. (2) Apple app-ID registration. (3) Developer-ID signing + notarization credentials. (4) Executed DMG build + notarization proof.
- **Owner:** Human (copy + registration) + External Provider (Apple) + Hardware (macOS).
- **Can execute now:** NO.
- **Required prerequisite:** App-ID + signing/notarization creds + macOS runner.
- **Proposed next task ID:** T32-N (shared packaging task).

### D16 — Soravo IPC integration — IMPLEMENTED_UNVERIFIED (T32-C §2.20)

- **Evidence:** `commands/soravo_ipc.rs` (`session_snapshot`/`session_transition`, `inject_text` with oversize rejection); session + account IPC commands live; desktop CI job compiles the target (run 36509157391 desktop SUCCESS). Absence: no runtime IPC round-trip proof (snapshot/transition/inject against the session machine). Session *logic* is test-proven (13 ladder tests); this gap covers the IPC layer only.
- **A–F:** A: YES (all inputs in-repo: session machine + IPC commands + existing test harness patterns; no credential, Dashboard, hardware, or model input needed). B: NO. C: NO. D: NO. E: NO. F: YES (purely missing verification evidence — the only F-only row in the matrix).
- **Exact missing requirement:** One runtime round-trip test: `session_snapshot` → `session_transition` (valid + invalid transition) → `inject_text` (valid + oversize rejection) against the authoritative session machine, asserting state + typed errors.
- **Owner:** AI.
- **Can execute now:** YES (fully specified by v6 §05 session/IPC contracts; no external input).
- **Required prerequisite:** None.
- **Proposed next task ID:** T32-P (IPC round-trip verification — first AI task after T32-E commit).

### D17 — T30 transcription tests (5 tests) — STOP-GATED, NOT REOPENED (T30 §2.2–§4)

- **Evidence:** Exact left/right values recorded (T30 §2.2); mechanism root-caused (`remove_filler_words` universal English list + `normalize_transcription_output` capitalize-and-punctuate vs test-expected gated sets + raw lowercase); v6 pack has zero filler/normalization/punctuation mentions; both designs unspecified; implementation agrees with passing `test_normalize_transcription_output` + script-based `detect_output_language`.
- **A–F:** A: NO (any fix touches V1-frozen behaviour — 5 explicit T30 prohibitions). B: YES (product choice among T30 §4 Options A/B/C — including WHICH option is itself the decision). C: NO. D: NO. E: NO. F: NO.
- **Exact missing requirement:** Human product decision: Option A (rewrite 5 expectations to frozen behaviour + `// V1-FROZEN` annotation) / B (relocate to `#[ignore]`-marked `v1_deferred_post_processing` module + tracking task) / C (remove + file design as spec task) / reject-all. Until then the 5 stay red by design; rust CI job stays red by design.
- **Owner:** Human.
- **Can execute now:** NO.
- **Required prerequisite:** Owner selects A, B, C, or rejects all.
- **Proposed next task ID:** T32-K (transcription decision + exactly the approved option; executes only after approval).

---

## Deterministic roll-up

| Bucket | Count | Members |
|---|---|---|
| Can execute now: YES (AI, no external input) | 1 full + 2 partial | D16 full; D4-commit half + D12-coverage half (both deferred by T32-D no-commit STOP → T32-E); D13-item-1 (→ T32-J); D3-1 contract-ready (→ T32-F after ratification) |
| Needs Human/product decision | 9 | D1 (signup scope), D3-1 (ratify), D7 (offline policy), D8 (sync scope), D9 (catalog 10-item checklist), D10 (updater channel), D13 (leaked-password, B2 ADR), D15 (mic copy), D17 (A/B/C) + ADR-018 approval + branch-protection/release policy |
| Needs External Provider/dashboard/credential | 10 | D1–D7 (Supabase access/secrets), D3/D5 (Razorpay Plans + merchant enablement), D10 (keys/hosting), D11 (Cloudflare), D12–D14 (signing), D13 (Dashboard trim/toggles) |
| Needs Windows/macOS hardware | 3 | D10-staged-test (partial), D14, D15 |
| Needs authoritative model/catalog data | 1 | D9 |
| Missing verification evidence only (F) | 1 pure | D16 (the only row with no other gate) |

**Nothing in this matrix authorizes:** invented model IDs/hashes/mirrors/licenses/sets; invented updater endpoints/keys/URLs; fabricated deployment evidence; Razorpay Plan-ID patterns; LIVE-mode operations; Handy STT/audio/VAD/engine/language/filler/normalization changes; transcription test edits pre-decision.

## Ordered execution plan (owner-gated where marked)

1. **T32-E — Commit T32-A + T32-B (AI, owner-approved).** Fix `:122` blank-line + `PROGRESS.md:4` trailing-whitespace nits in same pass. PR #63 CI must cover the delta. Unblocks D4/D12 coverage halves. No behaviour change.
2. **T32-P — IPC round-trip verification (AI, no gate).** D16. First implementation task after T32-E.
3. **T32-F — subscription.cancelled vs ADR-012/v6 §06:22 alignment (AI after owner ratification).** D3-1. Webhook + tests only.
4. **T32-J — Webhook Deno-aware type/lint coverage (AI, no gate).** D13-item-1. Closes T16 F-09 remainder.
5. **[Owner] T32-K — Transcription A/B/C + catalog checklist + ADR-018.** D17 + D9 + T29 approval. Unblocks rust CI job.
6. **[Owner] T32-I — Catalog population (only after K evidences all 10 items).** D9. Hashes computed from pinned artifacts.
7. **[Owner + Supabase] T32-G — Deploy payment-checkout + TEST replay (lifetime + monthly).** D4-deploy half. Requires T32-E + TEST Plan IDs + secrets.
8. **[Owner] T32-H — Real TEST Plans/Subscriptions + Dashboard trim 53→8 + license-api parity + lifecycle.** D3-2 + D5 + D13-trim.
9. **[Owner] T32-O — Account/entitlement/cloud-sync round-trip verification.** D1 + D2 + D6 (+ D7 E2E once policy exists).
10. **[Owner] T32-Q — Offline-policy decision → implementation.** D7.
11. **[Owner] T32-R — Sync-scope decision (spec only if transcript sync is V1).** D8.
12. **[Owner] T32-M — Cloudflare first deployment.** D11.
13. **[Owner] T32-L — Updater channel (keys + endpoints + staged test).** D10.
14. **[Owner] T32-N — Windows/macOS signing + builds + notarization (+ mic copy + app-ID).** D14 + D15.
15. **[Owner] T32-S — Branch protection + release exercise.** D12 remainder.
16. LIVE mode: none performed or recommended until 1–15 evidence exists.

*Matrix: T32-D — Authority: T32-C + T16 + T29/T30/T31/T32-A/T32-B + v6 §05/§06/§15 + live repo evidence 2026-09-29. No commit or push. T30 dispute not reopened. Handy core untouched.*
