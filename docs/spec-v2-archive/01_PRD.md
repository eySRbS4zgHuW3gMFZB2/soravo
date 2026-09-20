# 01 — Product Requirements Document

## 1. Product definition

Soravo is a professional local-first desktop dictation application. It captures microphone audio continuously while a dictation session is active, performs speech recognition locally, shows low-latency transcription feedback, and injects only stable text into the user's active application.

The product is intentionally focused. It is not a meeting intelligence platform, cloud transcription SaaS, RAG assistant, collaboration suite, or general AI assistant.

### Core promise

> Fast, accurate speech-to-text that runs locally, keeps audio and transcripts private, and feels instantaneous.

## 2. Primary users

Primary:
- lawyers
- CEOs and executives
- founders and entrepreneurs
- consultants
- writers
- professional knowledge workers
- other users willing to pay for reliable productivity software

Students are not a primary acquisition segment.

## 3. Product goals

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

## 4. V1 functional requirements

### 4.1 Desktop shell

> **V1 Strategy Note (2026-09-17):** Soravo V1 uses Handy (https://github.com/cjpais/Handy) as desktop foundation. See `SORAVO_HANDY_CODE_REUSE_REPORT.md` for authoritative reuse strategy. The requirements below remain valid — they define what Soravo V1 must deliver, regardless of foundation choice.

- Tauri v2.
- React + TypeScript frontend.
- Rust core.
- shadcn/ui for frontend components.
- Tailwind CSS.
- Single-instance behavior.
- Native desktop menus/window behavior where required.
- macOS and Windows support.
- Linux is deferred.

### 4.2 Global hotkey

Users can configure the global dictation shortcut.

Modes:
- Hold-to-talk.
- Toggle-to-talk.

Shortcut recorder:
- displays current shortcut;
- enters recording mode;
- captures a valid key combination;
- Escape cancels;
- invalid combinations are rejected;
- conflicts are detected when possible;
- replacement is transactional;
- if the new registration fails, the old shortcut remains active;
- no restart is required when the platform allows runtime replacement.

The shortcut system must not initialize the microphone on the first keypress. Capture infrastructure is warmed before user interaction.

### 4.3 Audio

- Dedicated capture pipeline.
- Real-time-safe audio callback.
- No inference in the callback.
- No network/filesystem access in the callback.
- Bounded ring buffer.
- Timestamped audio frames.
- Pre-roll target around 300 ms.
- VAD controls recognition work but does not control whether audio is captured.
- Handle device changes, disconnects and reconnects.
- Handle long dictation sessions.
- Never silently lose the first phoneme because the microphone was initialized after the hotkey.

### 4.4 STT

Primary candidate:
- Parakeet-based local inference.

Fallback/accuracy candidates:
- Whisper family, preferably an efficient native/runtime implementation such as whisper.cpp where appropriate.

Rules:
- Do not assume a model is truly streaming merely because it exposes streaming APIs.
- Record whether an engine is:
  - cache-aware streaming,
  - buffered/sliding-window,
  - offline/batched.
- Avoid Python as a universal inference broker.
- Python is permitted only when a specific benchmark proves that it is required or materially better.
- The final engine is selected by benchmark, license, packaging, platform support, latency, memory and quality.

### 4.5 Transcription behavior

The transcript pipeline distinguishes:
- tentative text;
- committed text;
- final text;
- last emitted text.

Tentative text may be shown in the UI but must never be typed into the user's application.

Committed/final text may be injected.

The system must prevent:
- duplicate text;
- missing text;
- unstable retyping;
- overlap duplication;
- late chunks arriving after finalization;
- stale results from a previous session.

### 4.6 Floating pill

The pill is state-driven.

States:
- hidden/idle
- starting
- listening
- transcribing
- finalizing
- done
- error

The pill may:
- pop in/out;
- animate microphone/listening state;
- show tentative transcription;
- show errors;
- communicate finalization.

Timers may drive visual animation only. Timers must not be authoritative for product state.

### 4.7 Text injection

Preferred path:
1. native text insertion if available;
2. clipboard/paste fallback;
3. restore clipboard contents safely.

Requirements:
- preserve user clipboard where possible;
- avoid injecting tentative text;
- support common macOS and Windows applications;
- surface failure rather than silently losing dictated text.

### 4.8 Model manager

Model metadata must include:
- model id
- display name
- engine/backend
- version
- source
- repository/source URL
- files
- SHA-256 checksums
- size
- languages
- streaming capability
- cache-awareness
- hardware requirements
- license
- minimum application version

Installation:
1. download to temporary location;
2. verify size/checksum;
3. validate manifest;
4. atomically install;
5. load;
6. preserve previous working model if any step fails.

Never execute arbitrary downloaded model code/scripts.

### 4.9 Settings

Desktop settings:
- global hotkey
- interaction mode
- microphone
- model/backend
- language
- startup behavior
- launch at login where supported
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
- logout current session
- logout other sessions
- account deletion/request where appropriate
- download links

### 4.10 History

Local-only dictation history by default.

The product must clearly state that local history is stored on the device.

No cloud synchronization of dictated text in V1.

### 4.11 Custom vocabulary

Users can add custom words/phrases.

Vocabulary must be applied only through engine-supported mechanisms or a deterministic post-processing layer. It must never become a cloud service.

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

Website must not pretend that unavailable features exist.

Website must be responsive and accessible.

Use shadcn/ui for dashboard/control components where applicable.

### Umami

Use Umami for website analytics only.

Allowed examples:
- page views
- pricing page interaction
- download button clicks
- OS selection
- signup CTA
- purchase CTA
- navigation events

Never send:
- dictated text
- audio
- keystrokes
- transcript contents
- clipboard contents
- local app history
- raw device identifiers unless strictly necessary for an explicitly documented website security function

Umami data and product/admin data are separate.

## 6. End-user dashboard

The customer dashboard is intentionally small.

Minimum:
- account identity
- subscription status
- lifetime/license status
- password management
- device list
- active sessions
- logout current session
- logout other sessions
- desktop download links
- support/privacy/terms links

The dashboard must not expose administrative data.

## 7. Admin dashboard

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
- user unique ID
- user email/account identity
- subscription status
- device/session information
- account status
- relevant timestamps

Do not build a large enterprise admin platform.

Authorization must be server-side and role-based. Hiding an admin route in the frontend is not authorization.

## 8. Commercial system

Pricing target previously discussed:
- approximately $12/month
- approximately $50 lifetime

Final prices are a business decision and must be configurable/documented.

Payment provider:
- Razorpay.

Payment flow:
1. user authenticates;
2. user selects product;
3. payment is created through the server-controlled flow;
4. server verifies payment/signature using official Razorpay documentation;
5. webhook is verified and idempotently processed;
6. entitlement is written to Supabase;
7. desktop/web receives signed entitlement;
8. desktop caches entitlement for defined offline behavior.

Never put Razorpay secret credentials in the desktop application or public frontend.

## 9. Authentication

Supabase Auth is the identity layer.

Required:
- email/password or selected supported login method;
- secure password reset;
- session management;
- device/session visibility;
- logout;
- admin role enforcement;
- row-level security;
- rate limiting where appropriate;
- no service-role key in client applications.

## 10. Privacy

The product must not:
- upload microphone audio for STT;
- upload dictated transcript for analytics;
- log raw audio;
- log raw transcript;
- log keystrokes;
- silently collect clipboard data;
- use hidden tracking.

Network communication is limited to explicitly required functions such as:
- account/authentication;
- payment/entitlement;
- model downloads;
- software updates;
- public website analytics;
- support mechanisms.

## 11. Performance targets

Targets, not claims, until benchmarked:

- warm hotkey → capture ready: <50 ms target
- first useful partial: <300 ms target
- speech end → final: <500 ms target
- committed text injection: <50 ms target
- warm application startup: <2 s target

Performance reports must include:
- OS
- CPU
- GPU
- RAM
- app build
- engine
- model
- input format
- speech duration
- first partial latency
- finalization latency
- memory
- CPU/GPU utilization

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
- Redis unless a concrete requirement appears
- dozens of engines
- Linux V1 without ADR
- hidden telemetry
- Cloudflare R2 dependency

## 13. Success criteria

V1 is successful when:
- a fresh user can install the desktop app;
- configure a microphone and hotkey;
- dictate naturally;
- see low-latency UI feedback;
- receive correct text in a normal application;
- use it offline for local STT;
- create/manage an account;
- see entitlement and devices;
- purchase/activate a license through the supported flow;
- owner can see basic growth/subscription/device metrics;
- release binaries can be reproduced and verified;
- automated tests pass;
- TestSprite finds no unresolved P0/P1 product bugs;
- performance is benchmarked rather than guessed.

## 14. Scope-change rule

Any new feature must answer:
1. Which requirement does it satisfy?
2. What new security surface does it introduce?
3. What performance impact does it have?
4. What tests are required?
5. What phase does it belong to?
6. What can be removed to keep scope controlled?

No scope expansion is allowed merely because an AI agent suggests it.
