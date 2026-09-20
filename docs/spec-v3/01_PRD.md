# 01 — Product Requirements Document

**Version:** 3.0.0  
**Status:** Authoritative

---

## 1. Product Definition

Soravo is a professional local-first desktop dictation application. It captures microphone audio locally, performs speech recognition on-device, and injects only stable text into the user's active application.

The product is intentionally focused. It is not a meeting intelligence platform, cloud transcription SaaS, RAG assistant, collaboration suite, or general AI assistant.

### Core Promise

> Fast, accurate speech-to-text that runs locally, keeps audio and transcripts private, and feels instantaneous.

---

## 2. Primary Users

Primary:
- lawyers
- CEOs and executives
- founders and entrepreneurs
- consultants
- writers
- professional knowledge workers

Students are not a primary acquisition segment.

---

## 3. Product Goals

1. Make dictation feel immediate.
2. Keep audio and transcription local.
3. Provide reliable text injection into ordinary desktop applications.
4. Support both hold-to-talk and toggle-to-talk.
5. Make the hotkey configurable.
6. Provide professional settings and account controls.
7. Provide a lightweight customer dashboard.
8. Provide a lightweight owner/admin dashboard.
9. Ship a credible website and payment flow.
10. Enable an AI agent to build, test, recover, and release the product with minimal human intervention.

---

## 4. V1 Functional Requirements

### 4.1 Desktop Shell

**Implementation:** Handy (MIT) foundation, adapted for Soravo.

- Tauri v2
- React + TypeScript frontend
- Rust core
- shadcn/ui for frontend components
- Tailwind CSS
- Single-instance behavior
- macOS and Windows support
- Linux deferred (see ADR-021)

### 4.2 Global Hotkey

Users can configure the global dictation shortcut.

Modes:
- Hold-to-talk
- Toggle-to-talk

Shortcut recorder:
- Displays current shortcut
- Enters recording mode
- Captures valid key combination
- Escape cancels
- Invalid combinations rejected
- Conflicts detected when possible
- Replacement is transactional
- If new registration fails, old shortcut remains active
- No restart required when platform allows runtime replacement

**Critical:** The shortcut system must not initialize the microphone on the first keypress. Capture infrastructure is warmed before user interaction.

### 4.3 Audio

**Implementation:** Reuse Handy audio_toolkit, adapt to Soravo requirements.

- Dedicated capture pipeline
- Real-time-safe audio callback
- No inference in the callback
- No network/filesystem access in the callback
- Bounded ring buffer
- Timestamped frames
- Pre-roll target around 300 ms
- VAD controls recognition work but does not control whether audio is captured
- Handle device changes, disconnects, and reconnects
- Handle long dictation sessions
- Never silently lose the first phoneme

### 4.4 STT

Primary candidate:
- Parakeet-based local inference

Fallback/accuracy candidates:
- Whisper family (prefer efficient native/runtime implementation like whisper.cpp)

Rules:
- Do not assume streaming merely because APIs expose streaming
- Record whether engine is: cache-aware, buffered/sliding-window, or offline/batched
- Avoid Python as universal inference broker
- Python permitted only when benchmark proves required or better
- Final engine selected by benchmark, license, packaging, platform support, latency, memory, and quality

### 4.5 Transcription Behavior

The transcript pipeline distinguishes:
- tentative text (UI only, never injected)
- committed text
- final text
- last emitted text

Committed/final text may be injected.

Prevent:
- Duplicate text
- Missing text
- Unstable retyping
- Overlap duplication
- Late chunks arriving after finalization
- Stale results from previous sessions

### 4.6 Floating Pill

State-driven UI component with states:
- hidden/idle
- starting
- listening
- transcribing
- finalizing
- done
- error

Timers may drive visual animation only—not authoritative for product state.

### 4.7 Text Injection

Preferred path:
1. Native text insertion if available
2. Clipboard/paste fallback
3. Restore clipboard contents safely

Requirements:
- Preserve user clipboard where possible
- Avoid injecting tentative text
- Support common macOS and Windows applications
- Surface failure rather than silently losing dictated text

### 4.8 Model Manager

Model metadata must include:
- model_id, display_name, engine/backend, version, source
- repository/source URL, files, SHA-256 checksums, size
- languages, streaming capability, cache-awareness
- hardware requirements, license, minimum application version

Installation:
1. Download to temporary location
2. Verify size/checksum
3. Validate manifest
4. Atomically install
5. Load
6. Preserve previous working model if any step fails

Never execute arbitrary downloaded model code/scripts.

### 4.9 Settings

Desktop settings:
- global hotkey
- interaction mode
- microphone
- model/backend
- language
- startup behavior (launch at login)
- clipboard fallback
- history
- custom vocabulary
- diagnostics
- account/entitlement
- privacy information
- updates

Website settings/account:
- email/account identity
- password change/reset
- subscription/lifetime status
- device list
- active sessions
- logout current/other sessions
- account deletion where appropriate
- download links

### 4.10 History

Local-only dictation history by default.

No cloud synchronization of dictated text in V1.

### 4.11 Custom Vocabulary

Users can add custom words/phrases.

Vocabulary must be applied only through engine-supported mechanisms or deterministic post-processing. Never become a cloud service.

---

## 5. Website

The website must be a legitimate product website from the beginning.

Required pages:
- landing
- features
- pricing
- download
- FAQ
- support/contact
- privacy
- terms
- refund/cancellation
- login/account
- dashboard
- admin dashboard

Website must be responsive and accessible. Use shadcn/ui for dashboard/control components where applicable.

### Umami

Use Umami for website analytics only.

Allowed: page views, pricing page interaction, download button clicks, OS selection, signup/purchase CTA, navigation events.

Never send: dictated text, audio, keystrokes, transcript contents, clipboard contents, local app history.

Umami data and product/admin data are separate.

---

## 6. End-user Dashboard

The customer dashboard is intentionally small.

Minimum:
- account identity
- subscription/lifetime status
- password management
- device list
- active sessions
- logout current/other sessions
- desktop download links
- support/privacy/terms links

---

## 7. Admin Dashboard

Admin dashboard is owner-only.

Minimum:
- total users
- new users over selectable periods
- active users
- subscription count
- lifetime count
- cancelled/expired status counts
- device count
- growth chart
- subscription distribution chart
- user search
- user unique ID, email/account identity, subscription status
- device/session information
- account status
- relevant timestamps

Authorization must be server-side and role-based. Hiding an admin route in the frontend is not authorization.

---

## 8. Commercial System

Pricing target:
- approximately $12/month
- approximately $50 lifetime

Final prices are a business decision and must be configurable/documented.

Payment provider: Razorpay.

Payment flow:
1. User authenticates
2. User selects product
3. Payment created through server-controlled flow
4. Server verifies payment/signature using official Razorpay documentation
5. Webhook verified and idempotently processed
6. Entitlement written to Supabase
7. Desktop/web receives signed entitlement
8. Desktop caches entitlement for defined offline behavior

Never put Razorpay secret credentials in the desktop application or public frontend.

---

## 9. Authentication

Supabase Auth is the identity layer.

Required:
- email/password or selected supported login method
- secure password reset
- session management
- device/session visibility
- logout
- admin role enforcement
- row-level security
- rate limiting where appropriate
- no service-role key in client applications

---

## 10. Privacy

The product must not:
- upload microphone audio for STT
- upload dictated transcript for analytics
- log raw audio
- log raw transcript
- log keystrokes
- silently collect clipboard data
- use hidden tracking

Network communication is limited to:
- account/authentication
- payment/entitlement
- model downloads
- software updates
- public website analytics
- support mechanisms

---

## 11. Performance Targets

Targets, not claims, until benchmarked:

- warm hotkey → capture ready: <50 ms target
- first useful partial: <300 ms target
- speech end → final: <500 ms target
- committed text injection: <50 ms target
- warm application startup: <2 s target

Performance reports must include: OS, CPU, GPU, RAM, app build, engine, model, input format, speech duration, first partial latency, finalization latency, memory, CPU/GPU utilization.

---

## 12. Non-goals

Do not add:
- cloud STT
- meeting transcription
- diarization
- team collaboration
- RAG
- AI assistant/chat
- mobile apps
- plugin marketplace
- public SDK
- enterprise admin platform
- cloud transcript synchronization
- Kubernetes
- Redis unless concrete requirement appears
- dozens of engines
- Linux V1 without ADR
- hidden telemetry
- Cloudflare R2 dependency

---

## 13. Success Criteria

V1 is successful when:
- a fresh user can install the desktop app
- configure a microphone and hotkey
- dictate naturally
- see low-latency UI feedback
- receive correct text in a normal application
- use it offline for local STT
- create/manage an account
- see entitlement and devices
- purchase/activate a license through the supported flow
- owner can see basic growth/subscription/device metrics
- release binaries can be reproduced and verified
- automated tests pass
- TestSprite finds no unresolved P0/P1 product bugs
- performance is benchmarked rather than guessed

---

## 14. Scope-change Rule

Any new feature must answer:
1. Which requirement does it satisfy?
2. What new security surface does it introduce?
3. What performance impact does it have?
4. What tests are required?
5. What phase does it belong to?
6. What can be removed to keep scope controlled?

No scope expansion is allowed merely because an AI agent suggests it.
