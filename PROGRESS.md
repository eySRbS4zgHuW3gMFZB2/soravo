# Soravo Project Progress

> **Canonical status for AI agents**  
> **Last audited:** 2026-09-21  
> **Main SHA:** 549eeeec0d45364644313c45a7e5384af09df87d  
> **Authority:** SORAVO_PLAN.md, docs/spec-v3/

---

## Current Authority

- `SORAVO_PLAN.md` — Authoritative engineering plan
- `docs/spec-v3/` — V3 specification pack
- `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` — Handy migration status
- `docs/spec-v3/15_HANDY_REUSE_POLICY.md` — Handy reuse policy
- `docs/spec-v3/decisions/ADR-027-handy-derived-desktop-foundation.md` — Desktop foundation ADR

---

## Current Architecture

**Desktop:** Handy-derived foundation (derive/fork/rebrand)
**Web/Cloud:** Soravo-owned implementation
**Security:** Explicit CSP, least-privilege Tauri capabilities

---

## Overall Progress

**Foundation Progress:** ~65% (infrastructure, migrations, desktop foundation, CI)
**Implementation Progress:** ~45% (core features, integrations)
**Release Readiness:** ~25% (blocking items: model licensing, build, payment integration)

**Denominator:** Core functional blocks (web, cloud backend, desktop foundation, audio/STT, entitlements, security, CI, payment integration, model licensing)
**Exclusions:** Marketing polish, full E2E, public performance benchmarks, release packaging

---

## Completed

### Website / Web Platform
- Landing page, features, pricing, FAQ, support pages
- Account dashboard (WEB-008) with entitlements, devices, sessions display
- Admin dashboard (WEB-009) with user directory
- Login/reset-password flows
- Legal pages (privacy, terms, refund)
- Download page
- Analytics (Umami, env-gated)
- Production readiness tests

### Supabase / Backend
- Schema migrations (11 migration files):
  - Profiles + RLS authorization
  - Entitlements (monthly/lifetime, provider-neutral)
  - Devices and sessions
  - Admin role authorization
  - Product metrics
  - Admin user directory
- RLS policies enforced (user-only reads, no client writes)
- Supabase client library with env-gated initialization

### Payment / Entitlements
- Entitlements provider-neutral constraint (CLOUD-012)
- Razorpay integration architecture documented (ADR-024)
- License API skeleton (services/license-api)

### CI / Build Infrastructure
- GitHub Actions CI: web lint/typecheck/test/build, Rust format/clippy/test/audit, desktop build
- E2E tests with Playwright
- Dependency audit (cargo audit, cargo-deny)

### Desktop Foundation (Handy-Derived)
- Tauri v2 shell in apps/desktop/src-tauri
- Session state machine (IDLE → STARTING → LISTENING → TRANSCRIBING → FINALIZING → DONE → IDLE)
- IPC commands (runtime_status, ping, session_snapshot, session_transition, session_reset, inject_text)
- Hotkeys infrastructure
- Settings infrastructure (microphone, hotkey, model)
- Typing/engine integration
- Account IPC (sign-in/sign-out, entitlement check)
- Overlay/pill UI component

### Audio / STT Crates
- `crates/audio` — Audio capture abstraction with VAD (AUDIO-001)
- `crates/vad` — Voice activity detection
- `crates/stt` — Speech recognition engine trait and benchmark harness (STT-002)
- `crates/typing` — Input injection engine
- `crates/hotkeys` — Global hotkey registration
- `crates/history` — Desktop local history (foundation)
- `crates/config` — Settings persistence (foundation)

---

## Partially Complete

### Desktop (Handy-Derived)
- Feature/HANDY-MIGRATION-001 branch contains migration commits (PR #55)
- Migrated: audio_toolkit, clipboard, input/typing, settings, tray, shortcuts, overlay, model manager, transcription manager
- Branding cleanup pending (Portable Mode, tray tooltips, User-Agent)
- Linux build blocked on GTK/graphene dependencies in dev environment
- Rust/Tauri checks pending PR #55 merge

### Model Management
- Model manager exists in desktop src-tauri
- Model catalog empty (needs population)
- **Model licensing BLOCKED** (upstream licenses unverified)
- Downloader infrastructure exists (MODEL-002)

### STT Engines
- Parakeet and Whisper engine adapters documented
- Streaming transcription with partial/final segmentation (STT-003)
- **Benchmark not executed** (protocol exists, no measurements)
- Model weights licensing unknown (BLOCKED)

### Audio Pipeline
- Audio capture crate complete
- Integration into full desktop flow pending

### Account/Entitlements
- UI for entitlement display complete
- Payment service skeleton exists (CLOUD-009)
- Razorpay webhook/idempotency not implemented
- Entitlement creation flow (server-side) not implemented

---

## Blocked

1. **GTK system dependencies** — Linux desktop build requires libgtk-4-dev, libgraphene-dev, libwebkit2gtk-4.1-dev, libayatana-appindicator3-dev
2. **Model licensing verification** — Catalog empty; upstream licenses unknown (BLOCKED for production release)
3. **Payment server integration** — Razorpay webhook handling not implemented
4. **E2E desktop build/test** — Requires GTK dependencies + merged migration PR

---

## Not Started

- Public benchmark execution (protocol defined, no measurements)
- Production desktop packaging (NSIS/DMG signing)
- Supabase function deployment (supabase/functions empty)
- Full desktop E2E tests
- Production deployment pipeline (Cloudflare Pages verified but not automated)

---

## Desktop — Handy-Derived Foundation

### Already Available from Handy
- Tauri desktop shell
- Audio toolkit with VAD
- Clipboard operations
- Input/typing integration
- Settings storage
- System tray
- Global shortcuts/hotkeys
- Overlay/pill UI
- Model manager infrastructure
- Transcription manager

### Already Derived into Soravo
- Session state machine (Soravo-owned contracts)
- IPC events (typed, Soravo-owned)
- CSP (explicit, restrictive)
- Capabilities (least-privilege)
- Account IPC (Soravo auth contract)
- Branding: product name "Soravo", bundle ID com.soravo.desktop

### Remaining Migration Work
- Merge PR #55 (feature/HANDY-MIGRATION-001)
- Complete branding cleanup (Portable Mode, tooltips, User-Agent)
- Install GTK dependencies for Linux builds
- Run Rust/Tauri checks post-merge

### Soravo-Specific Replacements/Extensions
- Session state machine (Soravo specification)
- Entitlements verification (Soravo contract)
- RLS policies (Soravo security)

---

## Website / Cloud

| Area | Status | Evidence |
|---|---|---|
| Soravo website | ✅ COMPLETE | apps/website/src/ (landing, account, admin, legal) |
| Cloudflare Pages | ✅ COMPLETE | git log shows WEB-012 deployment |
| Supabase backend | ✅ COMPLETE | supabase/migrations/ (11 migration files) |
| Authentication | ✅ COMPLETE | CLOUD-002 migration, auth-context.ts |
| Database schema | ✅ COMPLETE | RLS policies enforced |
| RLS authorization | ✅ COMPLETE | Column-level SELECT grants, no client writes |
| Account dashboard | ✅ COMPLETE | WEB-008, account.tsx |
| Entitlement system | ✅ COMPLETE | CLOUD-004/012, entitlements table |
| Admin user directory | ✅ COMPLETE | CLOUD-013 |

---

## Audio / STT

| Component | Status |
|---|---|
| Audio capture (AUDIO-001) | ✅ Foundation complete |
| VAD integration | ✅ Integrated |
| STT engine trait | ✅ Foundation complete |
| Benchmark harness (STT-002) | ✅ Implemented |
| Parakeet engine | 🟨 Planned (implementation in cradle) |
| Whisper engine | 🟨 Planned (implementation in cradle) |
| Streaming transcription (STT-003) | ✅ Implemented |
| **Benchmark execution** | ❌ NOT EXECUTED (blocked) |
| **Model licensing** | ❌ BLOCKED (unknown upstream) |

---

## Account / Entitlements / Payments

| Area | Status |
|---|---|
| Account IPC commands | ✅ Implemented |
| Account dashboard UI | ✅ Implemented |
| Entitlements schema | ✅ Implemented |
| Entitlements provider-neutral | ✅ Implemented (CLOUD-012) |
| Razorpay integration | 🟨 Skeleton (services/license-api) |
| Payment webhook handling | ❌ Not implemented |
| Entitlement creation flow | ❌ Not implemented |

---

## Security / Licensing

| Area | Status |
|---|---|
| CSP (explicit, restrictive) | ✅ Implemented |
| Tauri capabilities (least-privilege) | ✅ Implemented |
| No desktop telemetry | ✅ Enforced |
| No cloud STT endpoints | ✅ Enforced |
| No service keys in desktop | ✅ Enforced |
| RLS authorization | ✅ Enforced |
| Dependency audit | ✅ CI integrated |
| **Model licensing** | ❌ BLOCKED |

---

## Release

| Area | Status |
|---|---|
| CI pipeline | ✅ Green (web, rust) |
| Desktop CI | 🟨 Blocked (GTK dependencies) |
| NSIS configuration | ✅ Foundation |
| **Production packaging** | ❌ Not complete |

---

## QA / Benchmarks

| Area | Status |
|---|---|
| Web unit tests | ✅ Implemented |
| E2E tests (Playwright) | ✅ Implemented |
| Benchmark protocol | ✅ Documented (12_BENCHMARK_PROTOCOL.md) |
| **Benchmark execution** | ❌ NOT EXECUTED |

---

## Current Priority

1. **Install GTK dependencies** — Enable Linux desktop build
2. **Merge PR #55** — Complete Handy migration
3. **Model licensing verification** — Contact upstream for model license terms
4. **Payment integration** — Implement Razorpay webhook handling
5. **Run benchmark** — Execute protocol to validate engine selection

---

## Do NOT Rebuild

**These systems already exist and must not be duplicated:**

- Website (apps/website) — Production-ready
- Supabase migrations (supabase/migrations) — 11 migration files
- RLS policies — Enforced
- Entitlements architecture — Implemented
- Desktop IPC/session — Implemented
- Audio capture (crates/audio) — Implemented
- STT trait/harness (crates/stt) — Implemented
- Settings infrastructure (crates/config) — Implemented
- Hotkeys (crates/hotkeys) — Implemented
- CI pipeline — Implemented

---

## Important Historical Work

- **PR #55** — feature/HANDY-MIGRATION-001 (Handy desktop foundation migration)
  - Contains commits: 842acdf9, 557cfb66, 5f56260c, 27bc0bc0
  - Migration audit report: docs/spec-v3/16_HANDY_MIGRATION_STATUS.md
- **V3 documentation** — PR #56 merged (SHA: 2fa7f9bf)

---

## Evidence

- **Main SHA:** 549eeeec0d45364644313c45a7e5384af09df87d
- **Website commits:** 09424d4f (WEB-008 account), de54e722 (WEB-012 Cloudflare)
- **Supabase migrations:** 11 migration files in supabase/migrations/
- **PR #55 commits:** 842acdf9, 557cfb66, 5f56260c
- **CI:** .github/workflows/ci.yml (web, rust, desktop jobs)
- **Audio/STT:** crates/audio/, crates/stt/, crates/vad/

---

*Document generated: 2026-09-21*
