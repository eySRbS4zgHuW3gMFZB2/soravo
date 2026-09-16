# 02 — Technical Design Document

## 1. Architecture

```text
                    ┌───────────────────────────┐
                    │        Website            │
                    │ React/TS + shadcn/ui      │
                    │ Cloudflare-hosted         │
                    │ Umami analytics           │
                    └────────────┬──────────────┘
                                 │ HTTPS
                       ┌─────────▼─────────┐
                       │  License/Auth API │
                       │ server-controlled │
                       └──────┬───────┬────┘
                              │       │
                       ┌──────▼─┐   ┌─▼─────────┐
                       │Supabase│   │ Razorpay  │
                       │Auth/DB │   │ payments  │
                       └────────┘   └───────────┘

┌──────────────────────────────────────────────────────────────┐
│                        Desktop App                           │
│                                                              │
│ React/TS + shadcn/ui                                         │
│        │                                                     │
│        ▼                                                     │
│ Tauri commands/events                                        │
│        │                                                     │
│        ▼                                                     │
│ Rust core                                                    │
│ ┌────────┬─────────┬────────┬────────┬────────┬───────────┐ │
│ │Hotkeys │ Session │ Audio  │  VAD   │Scheduler│Transcript │ │
│ ├────────┼─────────┼────────┼────────┼────────┼───────────┤ │
│ │Typing  │ Models  │History │Config  │License │Diagnostics│ │
│ └────────┴─────────┴────────┴────────┴────────┴───────────┘ │
│                         │                                    │
│                         ▼                                    │
│                Local STT backends                            │
│                Parakeet / Whisper                            │
└──────────────────────────────────────────────────────────────┘
```

## 2. Repository

```text
/
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   └── src-tauri/
│   └── website/
├── crates/
│   ├── audio/
│   ├── vad/
│   ├── stt/
│   ├── scheduler/
│   ├── transcript/
│   ├── typing/
│   ├── hotkeys/
│   ├── models/
│   ├── licensing/
│   ├── config/
│   ├── history/
│   └── diagnostics/
├── services/
│   └── license-api/
├── supabase/
│   ├── migrations/
│   └── functions/
├── tests/
│   ├── integration/
│   ├── e2e/
│   ├── performance/
│   └── fixtures/
├── docs/
├── decisions/
├── tasks/
├── progress/
├── scripts/
└── .github/
```

## 3. Frontend

Desktop and website frontend use:
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix primitives through shadcn where applicable
- strict TypeScript
- accessible semantic controls

Frontend state must not become the source of truth for audio/STT session state.

Use an explicit state machine/event model.

Recommended:
- local UI state for presentation;
- typed Tauri events for desktop runtime;
- server state library only where justified for remote account/admin data.

## 4. Tauri

Tauri v2.

Use:
- commands for request/response operations;
- events for streaming session updates;
- least-privilege capabilities;
- restrictive CSP;
- no arbitrary frontend access to native APIs;
- typed IPC payloads.

Do not expose broad filesystem/process/network permissions merely for convenience.

## 5. Audio

Audio capture is a producer.

```text
Audio callback
    ↓
bounded ring buffer
    ↓
timestamped frames
    ↓
session/audio worker
    ↓
VAD + chunk scheduler
    ↓
STT backend
```

Audio callback rules:
- no blocking;
- no inference;
- no allocation-heavy operations where avoidable;
- no filesystem;
- no network;
- no UI work;
- bounded operations.

Warm capture:
- initialize device/capture pipeline before hotkey use when feasible;
- keep capture infrastructure warm;
- use pre-roll to protect first phonemes.

## 6. Session state

Authoritative session machine:

```text
IDLE
  ↓
STARTING
  ↓
LISTENING
  ↓
TRANSCRIBING
  ↓
FINALIZING
  ↓
DONE
  ↓
IDLE

Any state → ERROR → IDLE
```

Session IDs are mandatory.

Every async result carries:
- session_id
- sequence number
- timestamp/monotonic ordering metadata

Results from old sessions are discarded.

## 7. STT abstraction

Conceptual Rust trait:

```rust
trait SpeechEngine: Send + Sync {
    fn capabilities(&self) -> EngineCapabilities;
    fn load_model(&self, model: &ModelSpec) -> Result<()>;
    fn start_session(&mut self, config: SessionConfig) -> Result<()>;
    fn push_audio(&mut self, frame: AudioFrame) -> Result<Vec<TranscriptUpdate>>;
    fn finalize(&mut self) -> Result<Vec<TranscriptUpdate>>;
    fn cancel(&mut self) -> Result<()>;
    fn unload_model(&mut self) -> Result<()>;
}
```

Capabilities:
- streaming
- cache-aware
- languages
- punctuation
- capitalization
- hotwords
- hardware acceleration
- expected memory
- expected latency
- quality metrics

The scheduler selects by capabilities and benchmark profile, not hard-coded engine names.

## 8. Parakeet and Whisper strategy

Parakeet is the primary fast-path candidate.

Whisper is the fallback/accuracy path.

The implementation must permit:
- Parakeet-only configurations;
- Whisper-only configurations;
- benchmark-selected defaults;
- future engines without rewriting the session architecture.

The agent must create a benchmark harness before locking the production backend.

## 9. Transcript stabilization

For cache-aware streaming:
- append/commit according to engine semantics.

For non-cache-aware sliding windows:
- use a deterministic stabilization strategy such as LocalAgreement or another benchmarked method;
- calculate overlap;
- avoid re-emitting identical committed prefixes.

No naïve timer-based “every N milliseconds, inject the latest transcript” implementation.

## 10. Typing

```text
Committed transcript
        ↓
Typing abstraction
        ├── native insertion
        └── clipboard/paste fallback
```

Clipboard fallback must:
1. snapshot clipboard;
2. write dictated text;
3. paste;
4. restore original clipboard when safe;
5. report failure.

## 11. Model management

Use a signed/verified manifest when practical.

Model lifecycle:

```text
DISCOVERED
  ↓
DOWNLOADING
  ↓
VERIFYING
  ↓
INSTALLING
  ↓
AVAILABLE
  ↓
LOADED

Failure → preserve previous AVAILABLE model
```

Never execute downloaded arbitrary scripts.

## 12. Account and entitlement architecture

Supabase:
- users/auth
- profiles
- entitlements
- devices
- sessions
- payment references
- webhook records
- admin roles

Do not store:
- audio
- transcripts
- local history
- keystrokes

Payment server:
- owns Razorpay secret
- verifies signatures
- validates webhook authenticity
- performs idempotency
- writes entitlement

Desktop:
- contains only public configuration needed to reach backend;
- never contains server-side payment secrets;
- receives signed entitlement;
- caches entitlement according to explicit offline policy.

## 13. Suggested data model

```text
profiles
  id (uuid, FK auth.users)
  public_user_id
  display_name
  role
  created_at
  updated_at

entitlements
  id
  user_id
  product
  plan
  status
  provider
  provider_customer_ref
  provider_payment_ref
  starts_at
  expires_at
  created_at
  updated_at

devices
  id
  user_id
  device_public_id
  platform
  app_version
  first_seen_at
  last_seen_at
  revoked_at

sessions
  id
  user_id
  device_id
  session_hash/public_session_id
  created_at
  last_seen_at
  revoked_at

webhook_events
  id
  provider
  provider_event_id
  event_type
  processed_at
  status
  created_at
```

Do not store unnecessary PII.

## 14. Admin authorization

Use server-side role enforcement.

A request is authorized by:
- authenticated user;
- role;
- resource ownership;
- explicit admin policy.

Frontend route hiding is only UX.

Admin queries should expose only necessary fields.

## 15. Admin metrics

Product metrics can be derived from:
- user rows;
- entitlement rows;
- device rows;
- session rows.

Do not use Umami for product entitlement/account truth.

Umami is for website behavior.

## 16. Website deployment

Use Cloudflare-hosted deployment.

The selected hosting product is **Cloudflare Pages** (ADR-014): the website is a Vite + React static SPA with no server-side logic, needs no Cloudflare Worker runtime, and Pages hosts the existing `dist/` build on the free plan with native SPA fallback and a static `_headers` mechanism. Cloudflare's current guidance recommends Workers + Workers Static Assets for new sites; that option was evaluated and recorded as the alternative not selected for V1 (ADR-014). Verifying current Cloudflare recommendations remains mandatory before deployment.

Do not migrate hosting merely because a skill suggests it. Existing product scope wins unless an ADR approves migration.

No R2 dependency.

## 17. Keep-alive

If the Supabase free project requires activity to avoid inactivity pausing:
- prefer a legitimate scheduled backend health/maintenance mechanism;
- never fake user activity;
- never send fake desktop usage;
- document exactly what is being checked.

A scheduled Cloudflare Worker or GitHub Action may be used if needed and allowed by current free-tier rules.

## 18. Logging

Local logs:
- bounded;
- structured;
- redact secrets;
- no audio;
- no transcript;
- no keystrokes;
- no clipboard;
- no access tokens.

Production server logs:
- request IDs;
- event types;
- status;
- latency;
- safe identifiers;
- no payment secrets;
- no password;
- no transcript.

## 19. Updates

Desktop update system must verify:
- source;
- signature/checksum;
- expected version;
- platform/architecture.

GitHub Releases are the initial binary distribution mechanism.

## 20. CI

Required:
- format
- lint
- typecheck
- unit tests
- integration tests
- security checks
- build
- package validation
- E2E where applicable
- TestSprite pass for relevant release candidates

## 21. Architectural anti-patterns

Reject:
- Python universal inference broker;
- UI-thread inference;
- blocking audio callbacks;
- hotkey-triggered microphone initialization;
- arbitrary cloud transcription;
- raw audio uploads;
- transcript telemetry;
- unverified model downloads;
- unstable transcript injection;
- React as audio/session source of truth;
- secrets in frontend;
- fake payment success;
- unrestricted Tauri capabilities;
- admin authorization only in UI;
- arbitrary SQL concatenation;
- raw user strings interpolated into shell commands;
- giant monolithic Rust module;
- giant monolithic React component;
- unnecessary microservices.
