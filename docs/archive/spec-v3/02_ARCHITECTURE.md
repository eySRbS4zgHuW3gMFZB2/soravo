# 02 — Architecture

## 1. Actual Architecture

```text
                    SORAVO SPECIFICATION
                           │
                           ▼
                 ┌──────────────────────┐
                 │  Soravo Application  │
                 │    Architecture      │
                 └──────────┬───────────┘
                            │
           ┌────────────────┼─────────────────┐
           │                │                 │
           ▼                ▼                 ▼
    Soravo-specific     Handy-derived     External
    domain contracts    implementation      services
           │                │                 │
           │                │                 ├── Supabase
           │                │                 ├── Razorpay
           │                │                 ├── Cloudflare
           │                │                 └── GitHub Releases
           │                │
           │                ├── Tauri shell
           │                ├── React/TS frontend
           │                ├── Rust core
           │                ├── audio_toolkit
           │                ├── VAD
           │                ├── global shortcuts
           │                ├── input/typing
           │                ├── clipboard
           │                ├── overlay
           │                ├── model manager
           │                ├── transcription
           │                ├── settings
           │                ├── history
           │                └── tray

```

**Key Principle:** Implementation ownership (Handy) and requirement ownership (Soravo) are different concepts. Soravo requirements remain authoritative.

---

## 2. Soravo-Owned Contracts

### 2.1 Session State Machine

```text
IDLE → STARTING → LISTENING → TRANSCRIBING → FINALIZING → DONE → IDLE
                                    ↓
                               ERROR → IDLE
```

Every async result carries:
- session_id
- sequence number
- timestamp/monotonic ordering

Stale results from old sessions are discarded.

### 2.2 Transcript Semantics

- tentative text (UI only, never injected)
- committed text (stable, may be injected)
- final text (confirmed complete)

Tentative text must never be typed into the user's application.

### 2.3 IPC/Event Semantics

- Typed Tauri commands for request/response
- Typed events for streaming updates
- IPC payloads validated on both sides
- No frontend access to unvalidated native paths

### 2.4 Security Model

- Explicit CSP (no arbitrary inline scripts)
- Least-privilege Tauri capabilities
- No desktop telemetry
- No cloud STT/audio/transcript endpoints
- No Supabase service-role key in desktop
- No Razorpay secrets in client

### 2.5 Model Manifest

Every model must include:
- model_id, display_name, engine/backend, version
- source, repository_url, files
- SHA-256 checksums, size, languages
- streaming_capability, cache_aware, hardware_requirements
- license, commercial_use, redistribution_rights
- minimum_application_version

### 2.6 Account Architecture

Supabase:
- users/auth
- profiles
- entitlements
- devices
- sessions
- payment references
- webhook records
- admin roles

Desktop receives signed entitlement; never contains server secrets.

### 2.7 Entitlement System

- Server owns Razorpay secret
- Server verifies signatures and webhook authenticity
- Server writes entitlement to Supabase
- Desktop receives and caches signed entitlement
- Device/session enforcement

### 2.8 Licensing

- Soravo product licensing (commercial)
- Handy code reuse (MIT)
- Model licenses (verified per-model, separate from software)
- Dependency licenses (audited)

### 2.9 Benchmark Policy

Engine selection is benchmark-driven, not assumed. Required metrics:
- first partial latency
- finalization latency
- real-time factor
- WER/CER
- resource usage
- stability
- packaging complexity
- platform compatibility

### 2.10 Release Policy

- GitHub Releases for distribution
- Signed binaries
- Checksums
- Reproducible CI
- Release notes
- Fresh-machine verification

---

## 3. Handy-Derived Implementations

Handy already solves these generic desktop problems. Soravo SHOULD reuse/adapt rather than recreate.

| Subsystem | Handy Module | Soravo Status |
|---|---|---|
| Tauri shell | tauri.conf, capabilities, build | ADOPT with Soravo branding |
| React/TS frontend | app.tsx, components | ADOPT, replace UI with Soravo design |
| Rust core | lib.rs, main.rs | ADOPT, adapt to Soravo module structure |
| Audio capture | audio_toolkit | ADAPT to Soravo pre-roll/warm requirements |
| VAD | vad-rs integration | REUSE with Soravo session coordination |
| Global shortcuts | shortcut/HandyKeys | ADAPT to Soravo hold/toggle modes |
| Typing/input | input/typing | REUSE, wrap in Soravo committed/final abstraction |
| Clipboard | clipboard module | REUSE, ensure clipboard preservation |
| Overlay/pill | overlay module | REPLACE with Soravo state-driven pill |
| Model management | catalog/model-manager | ADAPT with Soravo manifest/checksum requirements |
| Transcription | transcription/manager | ADAPT with Soravo session semantics |
| Settings | settings/persistence | REUSE, adapt to Soravo settings schema |
| History | history module | REUSE with Soravo privacy rules |
| Tray | tray module | ADAPT to Soravo branding |
| History | actions/mod.rs | REUSE as diagnostic foundation |

**Rule:** If Handy already provides a working solution, reuse it. Delete redundant Soravo implementations after migration.

---

## 4. External Services

### 4.1 Supabase

- Auth and identity layer
- Account profiles
- Entitlements
- Devices and sessions
- Payment references and webhook records
- Admin roles

Never stores: audio, transcripts, local history, keystrokes

### 4.2 Razorpay

- Server-side payment processing
- Server verifies signatures
- Webhook verification and idempotency
- Entitlement writes

Desktop never contains Razorpay secrets.

### 4.3 Cloudflare

- Website hosting (Cloudflare Pages per ADR-014)
- Website analytics via Umami
- No R2 dependency

### 4.4 GitHub

- Releases for binary distribution
- CI/CD
- MCP for development/operations

---

## 5. Security Boundaries

```text
SORAVO SPECIFICATION (Authoritative)
           │
           ▼
    ┌─────────────────┐
    │  Soravo Contracts │
    └─────────┬───────┘
              │
    ┌─────────▼───────┐
    │  Handy Foundation │
    │  (Implementation) │
    └─────────┬───────┘
              │
    ┌─────────▼───────┐
    │    Security Audit │
    │  (Soravo baseline) │
    └─────────┬───────┘
              │
    ┌─────────▼───────┐
    │      Platform     │
    │   (Tauri/Rust)    │
    └─────────┬───────┘
              │
    ┌─────────▼───────┐
    │        OS         │
    │  macOS/Windows    │
    └─────────────────┘
```

Handy code must pass Soravo security baseline before release.

---

## 6. Implementation Ownership ≠ Requirement Ownership

| Aspect | Ownership |
|---|---|
| Requirements | Soravo specification |
| Security | Soravo specification |
| Privacy | Soravo specification |
| Session semantics | Soravo specification |
| Transcript semantics | Soravo specification |
| IPC contracts | Soravo specification |
| Account architecture | Soravo specification |
| Model manifest | Soravo specification |
| Release policy | Soravo specification |
| Implementation | Handy (where applicable) |
| Build system | Handy |
| Desktop plumbing | Handy |

If Handy implementation conflicts with Soravo requirements, Soravo wins. Create an ADR when diverging from Handy.

---

## 7. No Dual Implementations

If Handy provides a working solution, Soravo must NOT maintain parallel implementations. Document in ADR if keeping both is necessary (e.g., for benchmarking).

When a Handy-derived subsystem is fully compatible with Soravo requirements:
1. Migrate consumers
2. Run tests
3. Delete redundant Soravo code
4. Update documentation

---

## 8. Model Licensing Separation

Handy MIT license does NOT automatically determine:
- Model weight licenses
- Model redistribution rights
- Model hosting rights
- Commercial model use rights

Each model must be independently verified (see `17_MODEL_LICENSE_AND_PROVENANCE.md`).
