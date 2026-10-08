# R1 BLOCKER DECISION PACKET — 2026-10-08 (READ-ONLY AUDIT)

**Baseline:** `main` @ `eae7b8a1` (PR #104 merged, merge commit `185345e4`, verified live via `gh pr view 104` → state MERGED, mergedAt 2026-10-08T06:04:35Z). PR #104 merge record is the latest PROGRESS.md entry.

**Skills used (selected gate):** `gh-cli` (all GitHub state via authenticated `gh`), `supply-chain-risk-auditor` (asset/model licence+provenance posture, orphan crate assessment), `security-guidance` (auth/token-storage posture for PKCE decision, local-only STT boundary), `rust-engineer`+`tauri` consulted via the upstream R1-GAP-023/017 entries for the same settings-store contract (not re-executed here). Considered-and-declined: `semgrep`/`codeql`/`agent-security-audit` (no code changed — audit only), `cloudflare`/`supabase` skills (no service work), `playwright` (no E2E). No unused skill claimed.

## 1. R1-GAP-008 — Silero VAD asset

- **Current verified state:** Code/adapter complete (`SileroVad`, `apps/desktop/src-tauri/src/managers/audio.rs:287-297` resolves `resources/models/silero_vad_v4.onnx` via `BaseDirectory::Resource`; `preload_vad()` at `audio.rs:623`; default backend `VadBackend::Silero`, `settings.rs:509-511,1399`). Asset ABSENT: 0 `*.onnx` in repo, no `resources/` directory, and `tauri.conf.json` has **no `bundle.resources` key** — even a correctly obtained asset would not be packaged until that entry is added.
- **Evidence:** `docs/Soravo_Engineering_Docs_v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md:128` (upstream `src-tauri/resources/models/silero_vad_v4.onnx`, 1,807,522 B, present at pin `ba10ce19`, **absent locally and never in any ref**); §21 never-fabricate rule; T32-X/T33-O "0 approved, assets not code".
- **Why blocked:** Asset-acquisition gate, not a code gap. Never fabricate a model/VAD file, licence, hash, mirror, or URL.
- **Required decision:** Owner supplies (a) the exact `silero_vad_v4.onnx` provenance record (upstream source URL/tag, fetch date), (b) licence evidence (Silero VAD licence text + hash — note upstream ships a separate licence for the model; the software MIT licence does NOT discharge it, per v6 §21), (c) byte size + SHA-256 computed from the pinned artifact.
- **Recommended technical decision:** Acquire the upstream-pinned asset with recorded URL, size (target 1,807,522 B per §21 reference), SHA-256, and licence text; place at `apps/desktop/src-tauri/resources/models/silero_vad_v4.onnx`; add a `bundle.resources` entry to `tauri.conf.json`. Do NOT switch default backend to Earshot as a substitute.
- **Owner/legal-only:** Whether Soravo may redistribute the Silero weights under its licence; obtaining the artefact.
- **Exact artifact/input:** `silero_vad_v4.onnx` binary + SHA-256 + size + licence text file + provenance URL.
- **Earliest executable task after resolution:** Re-run `preload_vad` path tests + a recorded-dictation E2E (feeds R1-GAP-026); also unblocks any Silero-path recording test.
- **Safe to start now:** NO.

## 2. R1-GAP-011 — Real STT model readiness

- **Current verified state:** `settings.selected_model` defaults to `""` (`settings.rs:403,923`); onboarding derives `onboarding_completed = !selected_model.is_empty()` (`settings.rs:1110`); `ModelManager` clears a dangling selection (`model.rs:1537-1546`) and auto-selects the first available model otherwise (`model.rs:1563-1576`). Transcription loads `settings.selected_model` (`transcription.rs:764,1296`). `catalog.json` is the restored T33-L Handy catalog (127,334 B) but **0 of the 69 histogram models are licence-cleared for distribution** (T28/T10 checklist 0/9; 61 require notice, 1 restricted non-commercial, 7 unknown). No downloaded models exist.
- **Why blocked:** `selected_model` is empty because the catalog has no owner-approved, redistributable model entry and no model has been downloaded. The execution path (Parakeet via `transcribe-rs` ONNX, Whisper via `transcribe-cpp` GGUF per ADR-029, `crates/stt/src/engines/parakeet.rs`, `Cargo.toml` pins `transcribe-cpp 0.2.4` / `transcribe-rs 0.3`) is complete; invocation never occurs.
- **Required decision:** Owner runs the T28 §7 / T10 10-item catalog evidence checklist and approves a minimal set of models (T32-D §4.1: approved set, source org/host, per-model licence verdict + text, revision pins, byte-exact sizes/hashes from pinned artifacts, arch reconciliation with `KNOWN_ARCHES`, mirror URLs with untrusted-transport acknowledgment, a real `gen_catalog.py` procedure, per-v6-§21 chain-of-custody manifest).
- **Recommended technical decision:** Approve the smallest viable set (e.g. one licence-cleared Whisper GGUF for `transcribe-cpp` and/or one Parakeet ONNX for `transcribe-rs`) with pinned revision + SHA-256 + size, regenerate `catalog.json` via a real generator, and let `ModelManager` auto-select it.
- **Owner/legal-only:** Licence verdicts and the redistribution decision; hash computation from pinned artifacts is owner/upstream-host work.
- **Exact artifact/input:** Completed T10/T28 evidence checklist, approved model set list, pinned artefacts + hashes, working `gen_catalog.py`.
- **Earliest executable task after resolution:** R1-GAP-026 (real-model E2E dictation proof) and the "one reachable STT path produces text" R1 closure item.
- **Safe to start now:** NO.

## 3. R1-GAP-021 — PKCE + Supabase provider decision

- **Current verified state:** Web/PWA auth is decided (ADR-011: Supabase Auth, `flowType: "pkce"`, localStorage persistence, `/login` + `/account` routes). Desktop is NOT: `commands/account.rs` fails closed (`account_sign_in` returns an explicit error); the legacy placeholder `AccountMachine::request_sign_in` (`"user-123"`, `entitlement_active = true`) is confined, with 0 live IPC callers; `account.rs:100` points at "the T14 PKCE decision", which remains a recorded STOP — no T14 PKCE decision record exists in the repo.
- **Why blocked:** The desktop sign-in architecture is the unresolved product decision. ADR-011 governs the web app only and explicitly does not authorize a desktop flow.
- **Smallest deterministic decision required (owner, in writing):** Choose the desktop sign-in flow — (a) system-browser OAuth PKCE with deep-link callback (`com.soravo.desktop://…` redirect), (b) embedded-webview Supabase PKCE, or (c) in-app email/password against Supabase Auth — plus the redirect-URI allowlist entry to configure in the Supabase dashboard, the token-storage location (OS keychain vs encrypted file), and the device/session registration + entitlement-refresh cadence. One flow, one redirect scheme, one token store — then the desktop wiring task is executable.
- **Recommended technical decision:** (a) system-browser PKCE + deep-link callback + OS keychain token storage, because it keeps the password out of the app process and matches ADR-011's PKCE posture on desktop.
- **Owner/legal-only:** Supabase dashboard provider/redirect configuration, final flow choice, offline-entitlement policy.
- **Exact artifact/input:** A short owner decision note naming the chosen flow, redirect scheme, token store, and offline policy; Supabase dashboard redirect allowlist.
- **Earliest executable task after resolution:** R1-GAP-021 implementation (desktop `account_sign_in` real wiring, token storage, device/session registration, entitlement refresh).
- **Safe to start now:** NO.

## 4. R1-GAP-023 — Settings-store unification

- **Current verified state:** Proposal exists and was merged (`R1-GAP-023-SETTINGS-STORE-PROPOSAL.md`, PR #90, merge `4245ba34`). Both stores function; UI values for microphone/hotkey are behavior-inert (runtime reads Handy `AppSettings`); model selection diverges by default but is contained by the R1-GAP-017 mirror-only-on-canonical-success rule. Option A recommended (keep both stores + ratifying ADR + canonical-wins/mirror rule); B/D deferred, C rejected (violates V1 preservation). No code changed.
- **Why blocked:** Unifying persistence is an auth/storage architecture change → requires an ADR; retaining two implementations of one responsibility also requires an ADR (04 no-duplicate-stacks). Only the owner can issue/ratify it.
- **Required decision:** Owner ratifies Option A as ADR text (or selects B/C/D with rationale), i.e. "two stores, one owner each, Handy `AppSettings` canonical for runtime, `soravo-config` canonical for Soravo-owned account/model contract, mirror rule mandatory".
- **Recommended technical decision:** Ratify Option A exactly as proposed; defer Option B migration to a later V2.
- **Owner-only:** ADR ratification.
- **Exact artifact/input:** Ratified ADR (new ADR number) adopting Option A.
- **Earliest executable task after resolution:** The unification ADR's implementation phase (mirror-rule enforcement test + telemetry note); zero code is authorized before ratification.
- **Safe to start now:** NO (implementation); proposal work is DONE.

## 5. `crates/hotkeys` — orphan workspace crate

- **Current verified state:** `crates/hotkeys` (`soravo-hotkeys`) is a workspace member (`Cargo.toml:8`) with **zero in-repo consumers** — no `soravo-hotkeys`/`soravo_hotkeys` references outside its own directory; the legacy Soravo `hotkey.rs` stub was retired and the Handy-derived `shortcut/` module is the single hotkey architecture (PROGRESS HOTKEY-LEGACY-RETIREMENT entry). External target deps: `winapi 0.3`, `objc 0.2`, `core-foundation 0.9`, `cocoa 0.25`.
- **Why this is a supply-chain/architecture decision:** It pulls unmaintained native crates (`objc 0.2`, `cocoa 0.25`, `winapi 0.3` are legacy/deprecation-flagged lines) into the workspace lockfile with no consumer and no tests.
- **Required decision:** Owner decides: remove the crate (preferred — dependency surface shrinks; zero functional impact since no consumer), or keep with a stated future use.
- **Recommended technical decision:** Remove `crates/hotkeys` from workspace `members` and delete the directory; re-run `cargo deny`/`cargo audit` after removal.
- **Owner-only:** Removal authorization (architecture/supply-chain decision).
- **Exact artifact/input:** One-line owner decision; no external artifact.
- **Earliest executable task after resolution:** The removal PR (`Cargo.toml` members edit + `cargo metadata`/lockfile refresh + CI).
- **Safe to start now:** NO (decision pending).

## 6. Handy upstream sync candidates (recorded, NOT executed)

From `T34-SYNC-AUDIT-2026-10-08.md` (read-only; Handy pin `ba10ce19`, 2026-09-15; upstream HEAD `afe5a631…`, v0.9.7/v0.9.8 released):

- T34-SYNC-1: transcribe-cpp 0.2.4 → 0.3.0 (ADR-029 amendment; HIGH risk, ABI change; licence/checksum re-verification required).
- T34-SYNC-2: `engine_supervisor` worker isolation #2208 (rewrites `managers/transcription.rs`; needs ADR; HIGH risk).
- T34-SYNC-3: port #2227 model-loading overlay label (LOW risk).
- T34-SYNC-4: port #2116 portable legacy model cache (LOW-MED risk).
- T34-SYNC-5: port #1941 custom-sounds refresh (LOW risk).
- Open ratifications: ADR-027 (#2156/#2157 transcription semantics), ADR-028 (#2186 Chinese script selector); upstream version alignment v0.9.7/v0.9.8 is Soravo-owned.
- Already adopted: #2158, #2160, #2161, #2190, #2106, #2033, #1862, #2147.

## Summary table

| Blocker | Recommendation | Owner-only remainder | Next executable task after resolution | Start now? |
|---|---|---|---|---|
| R1-GAP-008 | Acquire pinned Silero asset + licence + SHA-256; add `bundle.resources` | Licence verdict, artefact acquisition | Silero-path recording/E2E tests; feeds R1-GAP-026 | NO |
| R1-GAP-011 | Complete T10/T28 10-item checklist; approve minimal licence-cleared set | Licence verdicts, redistribution | R1-GAP-026 real-model E2E dictation proof | NO |
| R1-GAP-021 | System-browser PKCE + deep-link + keychain; dashboard redirect allowlist | Flow/redirect/offline-policy choice, dashboard config | Desktop `account_sign_in` real wiring | NO |
| R1-GAP-023 | Ratify Option A as ADR; defer B migration | ADR ratification | ADR's own implementation phase | NO |
| crates/hotkeys | Remove orphan crate + lockfile refresh | Removal authorization | Removal PR | NO |
| Handy sync | T34-SYNC-3/4/5 first (low risk); T34-SYNC-1/2 after ADRs | ADR-027/028 ratification, ADR-029 amendment, version alignment | T34-SYNC-3 | NO |
