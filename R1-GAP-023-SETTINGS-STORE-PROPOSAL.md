# R1-GAP-023 — Settings-Store Unification Proposal (F5)

- Task: R1-GAP-023 · Date: 2026-10-07 · Branch: `r1-gap-023/settings-store-unification-proposal`
- Starting `origin/main` SHA: `4061cb97761dbe706d001174e1eab2cb6d20bbf8`
- Type: **proposal + verification-only**. No source, test, workflow, manifest, lockfile,
  catalog, ADR, config, or UI file is changed by this task. Code unification is
  explicitly deferred pending an owner-accepted ADR (see §6).
- Authority: T34-AI fresh R1 re-audit (authoritative R1-GAP-023 definition);
  v6 pack 01 (architecture change requires ADR), 04 (no-duplicate-stacks;
  keeping both requires an ADR), 09 (minimal implementation; Handy preservation;
  stop conditions); `commands/soravo_ipc.rs` header (two stores coexist
  historically; unification is a product decision, out of scope for T10-B);
  T32-Y F5 routing (unification routed to a separate decision, deferred).

## Skill Selection

- Task classification: repository/Git, GitHub, CI/CD, Rust, Tauri, TypeScript/React,
  Handy upstream analysis, testing/QA, documentation/specification/ADR, security
  (settings IPC + `SecretMap` file persistence touch).
- Mandatory skills selected and loaded: `gh-cli` (all GitHub reads: Handy pin proof,
  PR/CI state — authenticated `gh`, never raw HTTP); `rust-engineer` (settings-contract
  inspection); `tauri` (tauri-plugin-store vs `invoke` command IPC semantics);
  `react` (settings UI consumer contracts, read-only); `vitest` (test authoring/
  verification conventions); `security-guidance` + `securability-engineering`
  (IPC/file-persistence/secret-handling boundary review).
- Optional skills considered and declined: `github` (overlaps `gh-cli`);
  `tauri-development`/`tauri-setup` (no toolchain change); `rust-review` (no Rust
  written or hardened — read-only inspection via `rust-engineer`);
  `vercel-react-best-practices`/`vercel-composition-patterns`, `frontend-design`,
  `frontend-accessibility`, `shadcn`, `web-design-guidelines` (no UI change per task
  boundary); `playwright` (no browser E2E); `supabase`/`cloudflare`/`cloudflare-deploy`
  (no network/service work); `supply-chain-risk-auditor`, `semgrep`, `codeql`,
  `agent-security-audit`, `mcp-server-review` (zero dependency changes; SAST CLIs absent).
  Honestly missing: no dedicated settings/persistence skill is installed — repo
  contracts (03/05) and Handy source govern instead. No skill invented; no unused
  skill claimed.
- MCP/tools selected: `gh` CLI (GitHub reads); `cargo test`, `pnpm vitest` (verification).
  Every other configured server not required — deliberately not selected.
- Skills deliberately not selected: see declined list above with reasons.
- Authority/source boundary: repo facts from repo source; Handy facts from the pinned
  upstream via authenticated `gh` API (blob-level); CI facts from live `gh run` state.
  No chat history, memory, summary, or prior report substituted for any gate read.
- Conflicts found: none — no selected skill conflicts with the pack, ADRs, V1
  preservation, the source boundary, the security baseline, or any stop condition.
- Result: CLEAR.

## 1. Exact authoritative R1-GAP-023 definition

T34-AI (2026-10-06, the authoritative R1 re-audit — T33 treated as HISTORICAL/STALE):

- Class: **PARTIAL**.
- Text: *"R1-GAP-023 settings persistence (both stores work; F5 unification decision open)"*.
- Executable-now item: *"023 F5 settings-store unification proposal"*.
- Still open after R1-GAP-018 (2026-10-07): executable-now `023/028/007/009/004`;
  BLOCKED `008` (Silero asset), `011` (downloaded model), `021` (Supabase/PKCE owner
  decision); DEFERRED `022/027/029/030`; MISSING `026/028-E2E`.
- Prior boundary (R1-GAP-017, PROGRESS): *"`soravo_config` store shape untouched —
  R1-GAP-023 unification explicitly not decided here."* Honored: this task decides
  nothing in code either — it delivers the proposal the audit asked for.

## 2. What is currently duplicated or fragmented

Two independent persisted settings stores coexist; neither reads the other at load time:

| | Store 1 — Handy canonical (`AppSettings`) | Store 2 — Soravo UI-local (`soravo-config`) |
|---|---|---|
| Type | `AppSettings` (`apps/desktop/src-tauri/src/settings.rs`) | `soravo_config::Settings` (`crates/config/src/lib.rs`) |
| File | tauri-plugin-store `settings_store.json`, key `"settings"` | OS config dir `soravo/settings.json` (whole-file) |
| Shape | ~60 fields: bindings, `shortcut_activation`, audio, autostart, `selected_model: String`, microphone, language, overlay, paste, post-process (+ `SecretMap` API keys), theme, VAD, etc. | 4 sections only: `schema`, `microphone`, `hotkey`, `model` (`selected_engine`/`selected_model`/`available`/`status`) |
| Writers | Rust runtime (`write_settings` — audio/transcription/model commands, `secure_input`, onboarding/migrations) | `soravo_ipc` settings commands (`save_settings`, `update_*`) |
| Readers | **All runtime behavior**: audio, transcription, model manager (`switch_active_model` persists + loads `selected_model`), tray, secure input | **UI only**: General/Microphone/Shortcut/Model settings sections |
| Load hardening | salvage-per-field (#1619), schema migrations (v0→v2), binding backfill | `migrate()` v0→v1 stub; missing file → defaults |
| Duplicated concepts | microphone, shortcut/hotkey, model selection | microphone (`selectedDeviceIndex/Name`, `deviceAvailable`, `autoFallback`), hotkey (`binding`, `mode`, `enabled`), model (`selectedEngine/Model`, `available`, `status`) |

Sharpest divergence — model selection: canonical truth is `AppSettings.selected_model`
(read by transcription/tray; written only by validated `switch_active_model`). The UI
mirror (`soravo_config.model.selectedModel`) diverges by default; R1-GAP-017 contained
it with a one-way rule (mirror **only after** a successful canonical `set_active_model`,
engine-change persistence unchanged). Microphone/hotkey have the same shape of
divergence with no mirror rule: the settings UI edits `soravo-config` values that no
Rust runtime path reads (runtime reads `selected_microphone`, `bindings`/
`shortcut_activation` from `AppSettings`).

## 3. Which settings stores/contracts already exist (no new contract introduced)

- Typed IPC (all registered in `main.rs`, all exercised by the settings UI):
  `load_settings` / `save_settings` / `update_microphone_settings` /
  `update_hotkey_settings` / `update_model_settings` (`commands/soravo_ipc.rs`,
  via `crates/config` file persistence).
- Canonical model contract (R1-GAP-017): `get_available_models`, `set_active_model`
  (validate-downloaded → persist `AppSettings.selected_model` → load), `download_model`,
  progress/completion/failure/cancel events (`commands/models.rs`, `managers/model.rs`).
- Frontend mirrors (`apps/desktop/src/ipc.ts`): `Settings`/`MicrophoneSettings`/
  `HotkeySettings`/`ModelSettings` + model catalog mirrors — additive, untouched.
- Frontend consumers (all read-only here, unchanged): `general-settings.tsx`,
  `microphone-settings.tsx`, `shortcut-settings.tsx`, `model-settings.tsx`,
  `history-settings.tsx` (own feed, no settings store), `settings-layout.tsx`, `app.tsx`.

## 4. What Handy already does that is reused (provenance)

- Handy upstream identity: `https://github.com/cjpais/Handy` @
  `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` (pin of record, v6 §21). Verified live
  this session: pin exists upstream; `settings.rs` present at HEAD (`sha
  bd4ecbd9486acdaca38b57cba09473ef418da575`, 65,754 B).
- Byte comparison (upstream `settings.rs` at pin vs Soravo
  `apps/desktop/src-tauri/src/settings.rs`): **near-identical**. The entire diff is the
  intentional ADR-028 delta (Soravo stays pre-#2186 until the owner approves):
  `ChineseScript` enum + `chinese_script` field + its default/migration/tests absent in
  Soravo; plus one visibility widening (`pub(crate) SecretMap` → `pub SecretMap`).
  Everything else — `AppSettings` shape, defaults, salvage (#1619), migrations,
  `SETTINGS_STORE_PATH = "settings_store.json"`, store key `"settings"` — is
  Handy behavior and is preserved untouched.
- Classification: `AppSettings` store = **HANDY-REUSE** (pre-#2186 posture per
  PROPOSED ADR-028, correctly behind); `soravo-config` file store = **SORAVO-NEW**
  (no Handy equivalent — Handy has no `soravo/settings.json`); settings UI sections =
  **HANDY-ADAPT** (Soravo-owned views over both contracts); `model-feed.ts` mirror rule =
  **SORAVO-NEW** (R1-GAP-017).
- V1 preservation consequence: `settings.rs` is Handy-derived core-adjacent (v6 §21
  lists it on the 7-file adaptation surface). Any change to its shape, defaults,
  migration, or persistence path is a **Handy-core touch (HR-5)** and needs explicit
  justification + owner decision — not a tidy-up.

## 5. What Soravo-specific contracts must remain (untouched)

- Session state machine, transcript semantics (`Tentative` never injected/committed),
  typed IPC/event bus, `inject_text` committed/final-only path — untouched.
- Account/auth/session/entitlement, Supabase, payment/Razorpay, model licensing/
  provenance gates, release policy — untouched; no website/Supabase change.
- `SecretMap` redaction (`Debug` never prints values), 100 KB `inject_text` bound,
  camelCase/snake_case compat in `soravo-config` — untouched.
- Existing pill/settings visual language and layout — untouched (no UI redesign).

## 6. Minimum executable implementation vs proposal/deferred

- **Implemented now (this task):** (a) this proposal document — the exact executable
  item the T34-AI audit named; (b) verification that both stores work and all existing
  consumers remain compatible (evidence in §7). **Zero behavior changed.**
- **Explicitly proposal, not implementation:** any code unification (options in §8).
  Reason (authority ladder, not preference): unifying persisted settings is an
  **auth/storage architecture change** → requires an ADR (v6 01); retaining two
  implementations of one responsibility also requires an ADR (v6 04, no-duplicate-stacks);
  `soravo_ipc.rs` and T32-Y F5 both route it to a separate product decision; touching
  `settings.rs` persistence is HR-5 Handy-core. The agent cannot issue that ADR or make
  that product decision — the owner does, in writing.
- **Deferred (not executed, not blocked-on-this-task):** R2 licensing verification, R3
  benchmark, UI redesign, payment/release, Silero asset (008), downloaded model (011),
  Supabase/PKCE decision (021).

## 7. Verification-only evidence (nothing changed, everything re-proven)

Live `origin/main` pre-branch: `4061cb97`; branch cut clean (only pre-existing
untracked `.freebuff/`, never staged). Live GitHub at intake: PRs #88/#89 merged;
open PRs are dependabot-only (#40/41/43/45/46/47/59/70/71); latest main CI
(`37593405334`) + deploy (`37593405380`) both `success`.

- `cargo test -p soravo-desktop --lib settings` → **26/26 pass** (defaults, salvage
  per-field, poisoned/non-object stores, shortcut-activation/push_to_talk migration,
  overlay/GPU-device migrations, `SecretMap` redaction, frozen v0.9 fixture).
- `cargo test -p soravo-config` → **3/3 pass** (defaults, shortcut accept/reject).
- `pnpm vitest run` (apps/desktop) → **110/110 pass across 8 files** (incl. 24 model-feed
  + 21 history-feed + session/injection/pill suites — all consumers compatible).
- `tsc -b` / `eslint --max-warnings=0` status: not re-run here (no TS touched; last
  green on main CI `37593405334`). `cargo fmt/clippy`: not re-run (no Rust touched).
- Handy proof: pin commit + file identity fetched via authenticated `gh` API; local
  `diff` of `/tmp/handy_settings.rs` vs `settings.rs` = 69 lines, all ADR-028 delta +
  one visibility line (§4).

Single-source-of-truth check: **no second source introduced** — the tree already has
two, both keep working, and this task adds none, migrates none, and changes no
contract. No account/auth/model/payment state migrated. No dependency changed
(`Cargo.lock`/`pnpm-lock.yaml` untouched — verified via `git status` scoping).

## 8. Unification options and technical decision (for the owner ADR)

- **Option A — Keep both + ratify + canonical-wins (RECOMMENDED).** Document the
  standing rule: canonical runtime truth = `AppSettings` (all behavior reads it);
  `soravo-config` = UI-local persistence; model selection mirrors only on canonical
  success (R1-GAP-017 rule, extended by convention — not code — to treat any future
  overlap the same way). Owner accepts a narrow ADR recording the duplicate per v6 04
  (why both exist, which wins on conflict, that no silent migration occurs). Cost:
  near-zero, no Handy-core touch, no IPC change, no migration risk. Residual: dual
  files on disk; microphone/hotkey UI values remain behavior-inert until a later
  migration — documented, not hidden.
- **Option B — Migrate UI to `AppSettings` single store (DEFERRED).** Rewrite 4 UI
  sections + 5 IPC commands onto `AppSettings` fields, migrate existing
  `soravo/settings.json` files once, retire `crates/config` settings persistence.
  Correct long-term direction, but: HR-1 (IPC) + HR-5 (Handy-core-adjacent) high-risk,
  needs full regression + owner-accepted ADR + release-note migration. Not R1 work;
  not executed here.
- **Option C — Migrate runtime to `soravo-config` (REJECTED).** Would move ~15 Rust
  runtime call sites off the Handy store, rewrite Handy persistence behavior, and
  strand migrations/salvage hardening. Violates V1 preservation; rejected outright.
- **Option D — Read-through facade over both files (DEFERRED).** Adds an abstraction
  layer with canonical-wins + one-way sync. Same ADR requirement as B with less payoff
  while the UI surface is pre-redesign (ADR-010); revisit only if B is rejected.

Security note (per loaded skills): both stores hold user data; only `AppSettings`
holds secrets (`post_process_api_keys: SecretMap`, redacted `Debug`, never emitted on
IPC). Unification options B/D MUST preserve: redaction, no-secret-on-IPC, file
permissions parity, and the 100 KB injection bound. This proposal changes none of
them — stated so the future ADR cannot miss it.

## 9. Remaining R1 gaps (unchanged map minus this proposal)

Executable-now: 028 (desktop E2E harness, mocked devices/models), 007/009 (Earshot-path
recording tests), 004 (permission/capability runtime checklist). BLOCKED: 008 (Silero
asset), 011 (downloaded model), 021 (Supabase/PKCE owner decision). DEFERRED:
022/027/029/030. MISSING: 026 (real-model E2E dictation proof), 028-E2E. Plus prior
follow-up: model/audio/transcription invoke-handler registration verification (R1-GAP-018
observation). Exact next task: R1-GAP-028 harness or 007/009 — confirm from the gap audit
before starting; do not jump to 008/011 (prerequisites absent), R2/R3, payment, or UI
redesign.
