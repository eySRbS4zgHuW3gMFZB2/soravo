# Soravo — Handy Code Reuse Strategy, Gap Analysis, and Time-Saving Report

**Date:** 2026-09-17  
**Project:** Soravo  
**Purpose:** Define exactly how Soravo should reuse the Handy codebase, what should be retained, what must be replaced or hardened, what should not be reused, and how much engineering effort this can realistically save.

---

## ⚡ V1 STRATEGY DECISION (AUTHORITATIVE)

**Status:** APPROVED | **Date:** 2026-09-17

Soravo V1 desktop application uses Handy as its primary technical foundation.

### Handy Source
- **Repository:** https://github.com/cjpais/Handy
- **License:** MIT (code); branding NOT open-source — must not reuse Handy branding as Soravo branding
- **Revision:** To be pinned during audit phase (pre-implementation)
- **Provenance:** Requires formal provenance/licensing/dependency review before first code integration

### What V1 Reuses from Handy
- Tauri v2 application shell and Rust core
- React + TypeScript frontend architecture
- Cross-platform audio capture (macOS + Windows)
- VAD (Voice Activity Detection)
- Local STT integration (Whisper, Parakeet)
- Model lifecycle management
- Global hotkey system
- Text injection / clipboard handling
- Desktop settings infrastructure
- History/diagnostics plumbing
- Updater/release foundations

### What Remains Soravo-Specific
- Account/entitlement architecture (Supabase)
- Razorpay payment integration
- Signed entitlements and device/session licensing
- Soravo UI/UX/product experience (rebrand/replace Handy UI)
- Soravo-specific transcript semantics and business logic
- Security/capability model (Soravo requirements)
- Model benchmark methodology and engine selection
- Model manifest and supply-chain requirements
- Release gates and quality standards
- Commercial packaging and distribution
- Website and cloud architecture
- All product/legal/compliance decisions

### Constraints
- Do NOT blindly copy Handy — perform provenance, licensing, dependency, architecture, and security review
- Exact Handy revision must be pinned before implementation begins
- Handy branding must NOT be reused — all UI must be Soravo-branded
- This document is the authoritative reference for V1 Handy reuse strategy

---

## 1. Executive Summary

Soravo should **use Handy as a technical foundation for the desktop application, not as the finished Soravo product**.

This is a particularly strong fit because the current Soravo specification already mandates:

- Tauri v2
- Rust desktop core
- React + TypeScript frontend
- local speech recognition
- Parakeet as the primary candidate
- Whisper as the fallback/accuracy candidate
- cross-platform macOS + Windows support
- global hotkeys
- VAD
- model management
- text injection
- local history/settings
- performance-focused local inference

Handy already implements a substantial portion of this technical territory. Its current repository describes a Tauri + React/TypeScript + Rust application, with local Whisper and Parakeet inference, VAD, cross-platform audio, global keyboard shortcuts, and text insertion. The current repository is MIT licensed, while Handy's branding is explicitly not open-source and must not be reused as Soravo branding.

Source: Handy repository — https://github.com/cjpais/Handy

The correct strategy is therefore:

> **Fork/rebase Handy's implementation foundation, then progressively replace, harden, and extend it until it satisfies the Soravo specification.**

We should **not** throw away the existing Soravo engineering specification and simply "turn Handy into Soravo." The Soravo specification remains authoritative. Handy becomes an implementation asset underneath that specification.

The largest likely time savings are in the technically difficult desktop subsystems:

1. Tauri/Rust application foundation
2. cross-platform audio capture
3. VAD
4. local STT integration
5. Parakeet/Whisper runtime integration
6. model lifecycle infrastructure
7. global hotkeys
8. text injection / clipboard handling
9. desktop settings infrastructure
10. history/diagnostics and related desktop plumbing
11. updater/release foundations

The parts that should remain Soravo-specific include:

- account and entitlement architecture
- Supabase integration
- Razorpay integration
- signed entitlements
- device/session licensing
- Soravo UI/product experience
- Soravo-specific transcript semantics
- strict security/capability model
- benchmark methodology and final engine selection
- model manifest and supply-chain requirements
- release gates
- commercial packaging and distribution
- website/cloud architecture
- all product/legal/compliance decisions

### Bottom line

Handy can eliminate a very large amount of **low-level desktop engineering**, but it does not eliminate the need to engineer Soravo.

A reasonable planning model is:

| Approach | Approximate remaining desktop engineering effort |
|---|---:|
| Build Soravo desktop foundation from scratch | 100% |
| Reuse Handy selectively | ~45–65% of the original desktop effort |
| Aggressively reuse Handy after a proper audit | ~30–50% of the original desktop effort |
| Blindly fork Handy and patch until it works | Not recommended |

These percentages are planning estimates, not measured benchmarks.

For the project as a whole, the saving will be smaller because website/cloud/payment/account work is largely independent of Handy.

---

# 2. What the Soravo Specification Actually Requires

The Soravo engineering specification is authoritative over implementation choices.

The specification explicitly defines a Tauri v2 + React/TypeScript + Rust desktop architecture and requires local-first audio/transcription, no cloud STT, benchmark-driven engine selection, stable transcript handling, and committed/final-only text injection.

The PRD also explicitly requires:

- warmed capture infrastructure
- real-time-safe audio callbacks
- bounded audio buffering
- timestamped frames
- ~300 ms pre-roll
- VAD that controls recognition work rather than capture
- device disconnect/reconnect handling
- long-session stability
- Parakeet/Whisper engine abstraction
- tentative/committed/final transcript states
- stale-result rejection
- native insertion + clipboard fallback
- verified model installation
- local history
- custom vocabulary
- settings and diagnostics

These requirements mean that the existing specification is already more specific than a generic "fork Handy" plan.

The specification must therefore be treated as the **acceptance contract** for the reused code.

Relevant source documents:

- `README.md` — authority hierarchy and product principles
- `01_PRD.md` — product requirements
- `02_TDD.md` — technical architecture
- `04_IMPLEMENTATION_PLAN.md` — phased execution
- `05_TASK_BREAKDOWN.md` — atomic tasks
- `06_DOD_QA.md` — Definition of Done and release gates
- `09_SECURITY_BASELINE.md` — security requirements
- `12_BENCHMARK_PROTOCOL.md` — STT selection methodology
- `13_RELEASE_RUNBOOK.md` — release requirements
- `14_ENVIRONMENT_AND_SECRETS.md` — secret handling

---

# 3. What Handy Gives Us

Handy's current public repository describes an architecture very close to Soravo's intended desktop architecture.

It includes:

- Tauri
- React/TypeScript
- Rust
- local speech recognition
- Whisper
- Parakeet
- audio capture
- VAD
- global shortcuts
- text insertion
- model management
- settings
- history
- updater/release infrastructure
- diagnostics/debugging

The repository also identifies core libraries around:

- `transcribe-cpp`
- `transcribe-rs`
- `cpal`
- `vad-rs`
- `rdev`
- `rubato`

This is important because these are exactly the kinds of subsystems that would otherwise require substantial platform-specific engineering.

Handy's current README also describes both hold/push-to-talk and toggle interaction modes and states that it works across Windows, macOS and Linux.

Source:

https://github.com/cjpais/Handy

---

# 4. The Correct Mental Model

Do **not** think:

> "Handy is our app."

Think:

> "Handy is an existing implementation of several desktop engineering primitives that Soravo's specification also requires."

The difference is extremely important.

Handy is optimized around being a general open-source speech-to-text application.

Soravo has additional requirements around:

- commercial licensing
- accounts
- entitlements
- payments
- signed authorization
- benchmark-driven engine selection
- security
- product-specific UX
- release controls
- AI-agent recoverability
- stricter data boundaries
- deterministic transcript semantics

Therefore the architecture should become:

```text
                    SORAVO SPECIFICATION
                           │
                           ▼
                ┌──────────────────────┐
                │ Soravo Application   │
                │ Architecture         │
                └──────────┬───────────┘
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
          ▼                ▼                 ▼
   Soravo-specific     Hardened reused    External
   business/product    Handy foundation   services
   logic               components
          │                │                 │
          │                │                 ├── Supabase
          │                │                 ├── Razorpay
          │                │                 ├── Cloudflare
          │                │                 └── GitHub
          │                │
          │                ├── audio
          │                ├── VAD
          │                ├── STT runtime
          │                ├── model plumbing
          │                ├── hotkeys
          │                ├── typing
          │                └── desktop plumbing
          │
          └── Soravo UX / licensing / transcript / security
```

---

# 5. Reuse Matrix

## 5.1 Desktop foundation

### Handy code: REUSE HEAVILY

Handy's Tauri + Rust + React foundation aligns directly with the Soravo architecture.

Reuse:

- Tauri project structure
- Rust application initialization
- frontend/backend separation
- build configuration where appropriate
- platform-specific build plumbing
- existing Rust module organization where compatible
- existing development scripts where useful

### Required changes

- replace Handy branding
- replace application identifiers
- replace product metadata
- replace icons/assets
- remove Handy-specific product behavior
- align Tauri capabilities with Soravo's security baseline
- align IPC with Soravo's typed IPC requirements
- remove unnecessary permissions
- integrate Soravo's progress/agent workflow
- integrate Soravo CI/release conventions

### Soravo tasks affected

- DESKTOP-001
- DESKTOP-003
- FOUNDATION-003
- RELEASE-001
- RELEASE-002

### Expected saving

**High.**

This is one of the safest places to reuse existing implementation.

---

# 6. Audio Capture

## Recommendation: REUSE THE LOW-LEVEL AUDIO FOUNDATION, THEN HARDEN IT

Handy's audio implementation is highly valuable because cross-platform microphone capture is one of the areas where a deceptively simple feature becomes difficult.

The Soravo specification requires:

- dedicated capture pipeline
- real-time-safe callback
- no inference in callback
- no network/filesystem access in callback
- bounded ring buffer
- timestamped frames
- pre-roll
- device lifecycle handling
- long-session stability

Handy provides substantial audio infrastructure, but **we should not assume its behavior automatically satisfies these exact requirements**.

### Reuse

Potentially reuse:

- audio device discovery
- CPAL integration
- sample handling
- resampling
- audio worker architecture
- device selection
- device lifecycle mechanisms
- VAD integration points
- existing platform handling

### Rewrite/harden

Specifically audit:

1. callback allocations
2. callback locks
3. callback logging
4. callback filesystem access
5. callback network access
6. boundedness
7. timestamp semantics
8. pre-roll implementation
9. device disconnect behavior
10. device reconnect behavior
11. sample-rate changes
12. channel changes
13. long-session memory growth
14. first-phoneme preservation
15. cancellation behavior

### Critical Soravo difference

Soravo explicitly requires capture to be warmed before the first hotkey interaction.

That means we must verify that Handy's initialization model actually achieves the Soravo requirement rather than merely appearing responsive.

### Tasks affected

- AUDIO-001
- AUDIO-002
- AUDIO-003
- AUDIO-004
- AUDIO-005
- AUDIO-006
- AUDIO-007
- QA-008
- QA-009

### Expected saving

**High, but only after audit.**

---

# 7. VAD

## Recommendation: REUSE

Handy already uses VAD-related infrastructure.

Soravo's requirement is compatible with this approach.

However, the semantic rule must be preserved:

> VAD controls recognition work; it does not control whether audio is captured.

This distinction matters.

The audio capture system should continue receiving audio continuously while the dictation session is active. VAD can determine when the STT scheduler should process or prioritize recognition.

### Reuse

- VAD runtime
- VAD integration
- VAD configuration foundation
- silence detection primitives

### Verify

- latency
- false positives
- false negatives
- noise behavior
- interaction with pre-roll
- interaction with streaming STT

### Tasks

- AUDIO-005
- STT-005
- QA-007
- QA-008

### Expected saving

**Medium to high.**

---

# 8. STT / Parakeet / Whisper

## Recommendation: REUSE THE RUNTIME INTEGRATIONS, NOT THE DECISION

This is one of the most valuable Handy components.

Handy already supports local speech recognition and currently documents both Whisper and Parakeet-related runtimes.

Soravo's specification independently requires:

- Parakeet as the primary candidate
- Whisper as fallback/accuracy candidate
- an engine abstraction
- benchmark-driven selection
- native/runtime options where practical

This means Handy's existing inference adapters can substantially accelerate the project.

However:

> We must not simply declare Handy's current model/backend the Soravo backend.

Soravo explicitly requires a benchmark before production backend selection.

### Reuse

Potentially reuse:

- runtime bindings
- model loading code
- tokenizer/decoder plumbing
- inference worker patterns
- hardware acceleration integration
- Parakeet adapter foundation
- Whisper adapter foundation
- model metadata parsing

### Replace or refactor

Create a Soravo abstraction such as:

```text
SpeechEngine
 ├── ParakeetEngine
 ├── WhisperEngine
 └── FutureEngine
```

The application must depend on the abstraction rather than directly depending on Handy's implementation details.

### Benchmark requirements

Every candidate must be measured for:

- first partial latency
- finalization latency
- real-time factor
- WER
- CER where useful
- punctuation
- capitalization
- stability
- duplicate rate
- revision rate
- RAM
- CPU/GPU
- model load time
- cold start
- warm start
- binary size
- model size
- licensing
- platform availability
- dependency complexity

### Tasks

- STT-001
- STT-002
- STT-003
- STT-004
- STT-005
- STT-006
- STT-007
- STT-008
- QA-007

### Expected saving

**Very high.**

This may be one of the largest engineering savings in the whole project.

---

# 9. Transcript Stabilization

## Recommendation: DO NOT ASSUME HANDY'S IMPLEMENTATION IS SORAVO-COMPLIANT

This is an area where Soravo's specification is deliberately stricter.

Soravo requires explicit states:

```text
tentative
committed
final
last emitted
```

It also requires:

- session IDs
- ordering
- stale-result rejection
- duplicate prevention
- overlap handling
- finalization correctness
- no tentative injection

The TDD explicitly prohibits naïve timer-based injection.

Therefore:

### Reuse

- low-level transcription result plumbing
- engine callbacks/events
- result structures where useful

### Build Soravo's own layer

```text
STT engine
    ↓
raw result
    ↓
session-aware scheduler
    ↓
stabilization
    ↓
tentative / committed / final
    ↓
typing abstraction
```

### Tasks

- TRANS-001
- TRANS-002
- TRANS-003
- TRANS-004
- TRANS-005
- TRANS-006
- STT-006

### Expected saving

**Low to medium.**

We should reuse infrastructure but not inherit semantics blindly.

---

# 10. Global Hotkeys

## Recommendation: REUSE THE PLATFORM FOUNDATION, REWRITE THE PRODUCT SEMANTICS

Handy already implements configurable shortcut behavior and multiple interaction modes.

That gives us valuable platform-specific knowledge.

### Reuse

- global shortcut registration
- OS-specific integration
- key event handling
- shortcut parsing
- platform abstraction

### Soravo-specific implementation

We must implement the exact required behavior:

- hold-to-talk
- toggle-to-talk
- configurable shortcut
- recorder
- Escape cancellation
- invalid combination rejection
- conflict detection
- transactional replacement
- rollback if replacement fails
- no restart where platform allows
- warmed capture before first interaction

### Critical requirement

Hotkey handling must coordinate with the audio lifecycle.

The first keypress must not be responsible for starting the microphone pipeline.

### Tasks

- HOTKEY-001 through HOTKEY-006
- AUDIO-002

### Expected saving

**Medium to high.**

---

# 11. Text Injection and Clipboard

## Recommendation: REUSE HEAVILY, BUT WRAP IT IN A SORAVO TYPING ABSTRACTION

Text injection is another area where platform behavior is difficult.

Handy's existing implementation can save substantial time.

Soravo requires:

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

### Reuse

- platform typing
- keyboard simulation
- clipboard handling
- paste mechanisms
- platform-specific quirks

### Replace/harden

- enforce committed/final-only input
- guarantee no tentative text injection
- preserve clipboard
- add application compatibility matrix
- add failure reporting
- add deterministic tests

### Tasks

- TYPE-001
- TYPE-002
- TYPE-003
- TYPE-004
- TYPE-005

### Expected saving

**High.**

---

# 12. Model Manager

## Recommendation: REUSE THE MECHANICAL PARTS; REBUILD THE SECURITY CONTRACT

Handy already has substantial model management code.

This is valuable.

But Soravo's model system has explicit security and supply-chain requirements.

Required lifecycle:

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
```

Failure must preserve the previous working model.

Every model needs:

- model ID
- display name
- backend
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

### Reuse

- model discovery
- download mechanics
- progress reporting
- filesystem organization
- model loading/unloading
- existing runtime integration
- model cache

### Replace/harden

- signed/verified manifest
- checksum enforcement
- atomic installation
- rollback
- expected file-set validation
- license metadata
- platform compatibility
- malicious metadata handling
- no arbitrary model scripts
- supply-chain audit

### Tasks

- MODEL-001
- MODEL-002
- MODEL-003
- MODEL-004
- MODEL-005
- MODEL-006
- SEC-010
- QA-007

### Expected saving

**High.**

---

# 13. Settings

## Recommendation: REUSE THE MECHANICS, REBUILD THE PRODUCT MODEL

Handy has a mature settings system.

That is useful because settings persistence and migration systems are easy to underestimate.

### Reuse

- persistence
- serialization
- migration patterns
- settings storage
- change notifications

### Replace/add

Soravo settings include:

- global hotkey
- interaction mode
- microphone
- model/backend
- language
- startup
- launch at login
- clipboard fallback
- history
- vocabulary
- diagnostics
- account/entitlement
- privacy
- updates

The settings system must also remain compatible with Soravo's account/entitlement architecture.

### Tasks

- SETTINGS-001
- SETTINGS-002
- SETTINGS-003
- SETTINGS-004
- SETTINGS-005

### Expected saving

**Medium to high.**

---

# 14. History and Vocabulary

## Recommendation: REUSE STORAGE/UX MECHANICS, BUT KEEP SORAVO'S PRIVACY MODEL

Soravo requires local-only dictation history by default.

No cloud synchronization of dictated text is allowed in V1.

Custom vocabulary must remain local and must use engine-supported mechanisms or deterministic local post-processing.

Handy's history/dictionary infrastructure can be useful.

### Required audit

Confirm:

- no network transmission
- no analytics transmission
- no transcript telemetry
- deletion behavior
- retention behavior
- encryption requirements if later introduced
- migration behavior
- privacy disclosure

### Tasks

- HISTORY-001
- HISTORY-002
- VOCAB-001

### Expected saving

**Medium.**

---

# 15. Diagnostics

## Recommendation: REUSE CAREFULLY

Diagnostics infrastructure can be reused, but Soravo has strict logging rules.

Soravo must never log:

- audio
- transcripts
- passwords
- access tokens
- payment secrets
- clipboard contents
- raw authorization headers

Therefore any inherited debug/logging system must undergo a logging audit.

### Tasks

- DESKTOP-007
- SEC-012
- QA-008

---

# 16. Updater and Release Infrastructure

## Recommendation: REUSE THE FOUNDATION, REBUILD THE RELEASE POLICY

Handy already has release/updater infrastructure.

This is valuable because desktop release engineering is platform-specific and error-prone.

Soravo's release system must additionally support:

- GitHub Releases
- macOS builds
- Windows builds
- checksums
- reproducible CI
- artifact verification
- release notes
- fresh-machine testing
- rollback
- Soravo signing
- Soravo update metadata
- commercial distribution

### Tasks

- RELEASE-001
- RELEASE-002
- RELEASE-003
- RELEASE-004
- RELEASE-005
- RELEASE-006
- RELEASE-007

### Expected saving

**Medium to high.**

---

# 17. UI: What We Should and Shouldn't Reuse

## Recommendation: Reuse React/Tailwind plumbing; do not reuse Handy's product UI wholesale

Soravo has its own intended product experience.

The engineering specification requires:

- React
- TypeScript
- Tailwind
- shadcn/ui
- state-driven floating pill
- settings
- account controls
- diagnostics
- model management

Handy's UI can be useful as a reference for desktop-specific interactions, but Soravo should not inherit Handy's product identity.

### Reuse

- React application bootstrapping
- state management patterns where appropriate
- component organization where useful
- desktop IPC hooks
- settings plumbing
- platform integration

### Build

- Soravo design system
- Soravo floating pill
- Soravo onboarding
- Soravo settings UX
- Soravo account UI
- Soravo entitlement UX
- Soravo model UI
- Soravo diagnostics
- Soravo branding

### Why

The user experience is one of the places where Soravo should differentiate rather than merely clone another FOSS product.

### Tasks

- DESKTOP-002
- PILL-001
- PILL-002
- PILL-003
- SETTINGS-001 through SETTINGS-005
- DESKTOP-006

---

# 18. What We Absolutely Should NOT Reuse Blindly

The following areas require explicit review before reuse.

## 18.1 Branding

Do not reuse:

- Handy name
- Handy logo
- Handy icon
- Handy brand assets
- Handy-specific visual identity

The current Handy README explicitly states that its branding is not open-source.

Soravo must use its own identity.

---

## 18.2 Product assumptions

Do not inherit:

- Handy pricing assumptions
- Handy product positioning
- Handy feature priorities
- Handy analytics decisions
- Handy account model
- Handy licensing/business model
- Handy UX decisions simply because they exist

---

## 18.3 Analytics

Soravo explicitly requires:

- no audio telemetry
- no transcript telemetry
- no keystroke telemetry
- website analytics separated from product/account metrics

Any inherited analytics must be audited and either removed or redesigned.

---

## 18.4 Network behavior

Soravo is local-first.

Audit every inherited:

- HTTP client
- model download
- update check
- telemetry call
- remote endpoint
- diagnostics upload
- API call

Every network connection must have a documented purpose.

---

## 18.5 Model sources and model licenses

This is critical.

Using Handy's code does **not** automatically give Soravo rights to redistribute every model that Handy supports.

For each model:

- identify exact source
- identify exact version
- identify license
- identify redistribution requirements
- identify attribution requirements
- identify commercial-use restrictions
- identify whether model weights are actually redistributable
- record provenance

This is explicitly required by Soravo's model supply-chain baseline.

---

## 18.6 Dependencies

The Handy repository is MIT, but its dependencies are separate works with their own licenses.

Therefore:

> "Handy is MIT" does not mean "everything inside the Handy distribution is MIT."

Every dependency must be audited.

Required process:

```text
Handy dependency
       ↓
exact version
       ↓
license
       ↓
commercial compatibility
       ↓
notice/attribution requirement
       ↓
Soravo approved / rejected
```

---

# 19. Architecture We Should Aim For

The final codebase should not remain a messy fork.

It should evolve into a clean Soravo architecture.

Recommended structure:

```text
src-tauri/
├── core/
│   ├── session/
│   ├── events/
│   ├── state/
│   └── errors/
│
├── audio/
│   ├── capture/
│   ├── buffer/
│   ├── preroll/
│   ├── vad/
│   └── devices/
│
├── stt/
│   ├── engine.rs
│   ├── parakeet/
│   ├── whisper/
│   ├── scheduler/
│   └── stabilization/
│
├── transcript/
│   ├── session.rs
│   ├── tentative.rs
│   ├── committed.rs
│   ├── finalization.rs
│   └── ordering.rs
│
├── hotkey/
│   ├── registration/
│   ├── recorder/
│   └── modes/
│
├── typing/
│   ├── native.rs
│   ├── clipboard.rs
│   └── compatibility.rs
│
├── models/
│   ├── manifest/
│   ├── downloader/
│   ├── verifier/
│   ├── installer/
│   └── rollback/
│
├── settings/
├── history/
├── vocabulary/
├── diagnostics/
├── account/
├── entitlement/
└── security/
```

This does not mean every Handy file must be moved immediately.

The migration should be incremental.

---

# 20. Recommended Migration Strategy

## Stage 1 — Preserve the current Soravo specification

Do not rewrite the PRD/TDD around Handy.

Instead create an ADR:

> "Handy MIT foundation adopted for desktop implementation."

The ADR should record:

- exact Handy repository
- exact commit/tag used
- date
- license
- dependency audit status
- reused subsystems
- rejected subsystems
- known divergences
- migration plan

---

# 21. Stage 2 — Create a Handy Import Branch

Do not overwrite main.

Create something like:

```text
foundation/handy-integration
```

Import the exact audited Handy revision.

Immediately:

- replace branding
- rename application identifiers
- preserve MIT notices
- document provenance
- run existing tests
- establish a baseline build

The purpose is to make Handy reproducible before changing behavior.

---

# 22. Stage 3 — Create a Code Provenance Map

Create:

```text
docs/compliance/HANDY_PROVENANCE.md
```

For every reused subsystem record:

| Component | Handy source | Reuse | Modify | Replace | Reason |
|---|---|---|---|---|---|
| Tauri shell | audited | Yes | Yes | No | architecture match |
| Audio | audited | Yes | Yes | No | strong foundation |
| VAD | audited | Yes | Yes | No | compatible |
| Parakeet | audited | Yes | Yes | No | strong match |
| Whisper | audited | Yes | Yes | No | fallback |
| Hotkey | audited | Yes | Yes | No | platform complexity |
| Typing | audited | Yes | Yes | No | platform complexity |
| Model manager | audited | Yes | Yes | No | useful foundation |
| Settings | audited | Yes | Yes | No | storage foundation |
| History | audited | Yes | Yes | No | local foundation |
| Branding | audited | No | — | Yes | Soravo identity |
| Payments | — | No | — | Yes | Soravo-specific |
| Entitlements | — | No | — | Yes | Soravo-specific |
| Supabase | — | No | — | Yes | Soravo-specific |
| Razorpay | — | No | — | Yes | Soravo-specific |

The exact mapping must be filled by an engineering audit rather than guessed.

---

# 23. Stage 4 — Run Soravo Tests Against Handy Before Refactoring

This is one of the most important changes to our process.

Instead of asking:

> "Does Handy work?"

ask:

> "Which Soravo requirements does Handy already satisfy?"

Create a gap matrix:

```text
SORAVO TASK
     ↓
EXISTING HANDY IMPLEMENTATION
     ↓
PASS / PARTIAL / FAIL / UNKNOWN
     ↓
ACTION
```

Example:

```text
AUDIO-003 ring buffer
→ Handy audio buffering
→ PARTIAL
→ verify boundedness + timestamps
→ adapt
→ add Soravo tests
```

This prevents duplicated engineering.

---

# 24. Stage 5 — Convert Existing Handy Functionality Into Soravo Tasks

The current task list should remain the source of truth.

Instead of:

```text
STT-003 → implement Parakeet
```

we may change the task state to:

```text
STT-003
Status: PARTIAL — Handy foundation exists
Remaining:
- adapt to SpeechEngine
- add Soravo session semantics
- add benchmark integration
- add tests
- document license/provenance
```

This is exactly what the task system was designed to support.

---

# 25. Stage 6 — Benchmark Before Replacing Anything Major

Do not rewrite working STT code merely because the architecture looks different.

First benchmark.

The Soravo benchmark protocol requires:

- fixed hardware
- fixed audio
- fixed corpus
- release builds
- warm/cold runs
- repeated measurements
- latency
- RTF
- quality
- stability
- resource use
- packaging
- licensing

If Handy's runtime performs well, retain it.

If another implementation wins, replace it.

This keeps engineering evidence-driven.

---

# 26. Stage 7 — Refactor Into Soravo Boundaries

Once the reused implementation works:

- introduce Soravo interfaces
- isolate Handy-derived internals
- make the rest of the application depend on interfaces
- remove Handy-specific assumptions
- add Soravo tests

The end goal is that changing the underlying STT implementation does not require rewriting:

- hotkeys
- transcript handling
- UI
- typing
- account logic
- model UI

---

# 27. Stage 8 — Build the Missing Commercial Layer

This work is mostly independent of Handy.

Build:

```text
Desktop
   ↓
Soravo Account Client
   ↓
Supabase
   ↓
Entitlement Service
   ↓
Signed Entitlement
   ↓
Device/session enforcement
```

Separately:

```text
Website
   ↓
Razorpay
   ↓
Webhook verification
   ↓
Entitlement database
```

Handy should not be the source of truth for this architecture.

---

# 28. Stage 9 — Apply the Soravo Security Baseline

The security baseline remains authoritative.

Every reused component must undergo:

- Tauri capability review
- IPC review
- filesystem permission review
- network permission review
- dependency audit
- secret scan
- static analysis
- logging review
- model supply-chain review

The fact that code came from an established project does not waive Soravo's security requirements.

---

# 29. Stage 10 — Re-run the Entire DoD

A reused component is not automatically complete.

The universal Soravo Definition of Done requires:

- implementation
- tests
- security checks
- no unexplained warnings
- documentation
- progress update
- diff review
- commit
- push
- PR

P0/P1 defects block release.

Therefore every imported subsystem becomes Soravo-complete only after it passes Soravo's gates.

---

# 30. How Much Work Does This Actually Save?

The biggest mistake would be estimating savings by counting lines of code.

The real saving comes from eliminating entire classes of engineering problems.

For example, cross-platform audio requires dealing with:

- device enumeration
- device selection
- sample formats
- sample rates
- channels
- callbacks
- buffering
- resampling
- device disappearance
- device reconnection
- OS-specific behavior
- permissions
- long-session stability

A mature implementation can save substantially more than the number of lines copied suggests.

The same is true for:

- global keyboard hooks
- clipboard handling
- text injection
- native application compatibility
- local model loading
- hardware acceleration
- updater behavior

---

# 31. Estimated Savings by Subsystem

Planning estimates:

| Subsystem | Build from scratch | With Handy | Likely saving |
|---|---:|---:|---:|
| Tauri foundation | High | Low | Very high |
| React desktop shell | Medium | Low | High |
| Audio capture | Very high | Medium | High |
| VAD | Medium | Low | High |
| Parakeet runtime | Very high | Medium | Very high |
| Whisper runtime | High | Low/medium | High |
| Transcript stabilization | High | Medium/high | Medium |
| Global hotkeys | High | Medium | High |
| Typing/clipboard | High | Low/medium | High |
| Model manager | High | Medium | High |
| Settings | Medium | Low | High |
| History | Medium | Low | High |
| Diagnostics | Medium | Low | Medium |
| Updater | High | Medium | Medium/high |
| Soravo UI | Medium/high | Medium/high | Low/medium |
| Supabase | Independent | Independent | None |
| Razorpay | Independent | Independent | None |
| Entitlements | Independent | Independent | None |
| Website | Independent | Independent | None |
| Commercial security | Independent | Independent | None |

---

# 32. Overall Time-Saving Estimate

The previous project planning estimate assumed that a large portion of the desktop system would have to be built from relatively early foundations.

With Handy adopted as a foundation, that assumption changes.

A reasonable planning range is:

### Desktop portion

**Potential reduction: ~40–70% of raw implementation work for the desktop foundation and core local dictation stack.**

This is deliberately a range because the actual savings depend on:

- how closely the current Handy revision matches our target;
- how much of its streaming architecture passes the Soravo benchmark;
- how much refactoring is needed;
- how much existing code is already present in Soravo;
- platform-specific failures;
- license/dependency constraints;
- security findings.

### Whole project

The saving is smaller because these are not solved by Handy:

- website
- Supabase
- Razorpay
- account system
- entitlements
- admin
- commercial security
- legal/compliance
- release process
- Soravo product UX

Therefore a reasonable overall project planning reduction is closer to:

**~25–45% of the remaining engineering effort**, assuming aggressive but disciplined reuse.

That is an estimate, not a measured result.

---

# 33. Why the Savings Could Be Even More Important for You

The benefit is not just hours.

You are using AI coding agents.

AI agents are particularly effective when:

- a working reference implementation exists;
- the architecture is already executable;
- difficult platform-specific code already exists;
- tests can be run immediately;
- the agent can modify rather than invent.

Handy therefore changes the AI workload from:

```text
Understand problem
→ design architecture
→ implement
→ debug platform issues
→ discover edge cases
→ implement fixes
```

to more often:

```text
Understand Soravo requirement
→ locate corresponding Handy subsystem
→ audit it
→ adapt it
→ test against Soravo requirements
→ harden gaps
```

That is a much more favorable workload for an autonomous coding agent.

---

# 34. Parallel AI Work Becomes More Effective

Once Handy is integrated, work can be divided into parallel tracks.

### Agent A — Audio

- AUDIO-001..007
- capture
- ring buffer
- pre-roll
- VAD
- device lifecycle

### Agent B — STT

- STT-001..008
- Parakeet
- Whisper
- benchmark
- scheduler

### Agent C — Transcript

- TRANS-001..006
- stabilization
- ordering
- stale-result handling

### Agent D — Hotkey + Typing

- HOTKEY-001..006
- TYPE-001..005

### Agent E — Model Manager

- MODEL-001..006

### Agent F — Desktop UI

- DESKTOP-002
- PILL-001..003
- settings UI

### Agent G — Security/QA

- dependency audit
- Tauri capability review
- test matrix
- integration tests

This is considerably better than seven agents independently reinventing the same infrastructure.

---

# 35. What Should Remain Sequential

Some work should not be parallelized aggressively.

## STT engine selection

Do:

```text
implement benchmark harness
→ benchmark
→ select engine
→ ADR
→ production integration
```

Do not have three agents independently "choose" the production engine.

## Transcript semantics

The transcript state machine is foundational.

Finalize its contract before many dependent agents build on it.

## Entitlement architecture

The server-authoritative model should be designed before desktop licensing integration.

## Release architecture

Do not allow independent agents to redesign signing/updater/release behavior.

## Security model

Security requirements override convenience.

---

# 36. What We Should Change in the Current Task Breakdown

The current task breakdown is still useful, but many desktop tasks should change from:

> Implement

to:

> Audit Handy → adapt → harden → test → document.

For example:

### Before

```text
AUDIO-001 capture abstraction
```

### After

```text
AUDIO-001
Audit Handy capture implementation against Soravo audio contract.
Reuse compatible implementation.
Add Soravo abstraction where required.
Harden real-time safety.
Add unit/integration tests.
Document provenance.
```

Likewise:

### STT-003

```text
Audit Handy Parakeet integration.
Wrap in SpeechEngine.
Validate benchmark behavior.
Validate model licensing.
Add Soravo tests.
```

### TYPE-002

```text
Audit Handy clipboard fallback.
Adapt to Soravo typing abstraction.
Verify clipboard preservation.
Add injection/failure tests.
```

This should become the new pattern for all reused desktop tasks.

---

# 37. New Tasks We Should Add

The current specification needs several explicit Handy-adoption tasks.

## FOUNDATION-009 — Handy provenance and license audit

Deliver:

- exact upstream repository
- exact revision
- MIT license copy/notice
- dependency inventory
- dependency licenses
- model licenses
- attribution requirements
- branding exclusions

---

## FOUNDATION-010 — Handy architecture gap audit

Map:

```text
Handy subsystem
→ Soravo requirement
→ task
→ PASS/PARTIAL/FAIL
→ action
```

---

## FOUNDATION-011 — Handy import baseline

Deliver:

- reproducible imported revision
- clean build
- test baseline
- renamed application identity
- Soravo branding
- progress checkpoint

---

## FOUNDATION-012 — Handy provenance map

Maintain:

- reused files/modules
- modified modules
- replaced modules
- new Soravo modules
- reasons for changes

---

## SECURITY-013 — Third-party dependency/license audit

Review:

- Rust dependencies
- npm dependencies
- native libraries
- model runtimes
- model weights
- downloaded assets

---

## QA-013 — Handy regression comparison

Before major rewrites:

- benchmark existing Handy-derived implementation
- benchmark Soravo modifications
- compare regressions
- record results

---

# 38. What We Should Add to the ADR Index

Add an ADR such as:

```text
ADR-015 — Adopt Handy MIT Foundation
```

It should record:

### Decision

Soravo uses selected Handy source code as a desktop implementation foundation.

### Scope

Only approved subsystems.

### Authority

Soravo engineering specification overrides Handy behavior.

### License

Handy source is used subject to MIT requirements and separate third-party license review.

### Branding

No Handy branding is reused.

### Model licensing

Reviewed separately.

### Dependencies

Reviewed separately.

### Exit strategy

Soravo must be architecturally capable of replacing any Handy-derived subsystem.

---

# 39. What We Should NOT Do

## Do not simply replace the repository

Bad:

```text
delete Soravo
copy Handy
rename Handy → Soravo
```

This loses:

- Soravo requirements
- security baseline
- benchmark protocol
- account architecture
- entitlement architecture
- payment architecture
- agent recovery system
- task tracking
- release rules

---

## Do not blindly merge upstream Handy changes

Upstream updates may introduce:

- new dependencies
- new licenses
- new network behavior
- new telemetry
- new capabilities
- architectural changes
- product behavior Soravo does not want

Any upstream sync should undergo a controlled audit.

---

## Do not assume all Handy functionality is better than the Soravo design

Handy is the implementation source, not the product authority.

If Soravo requires behavior that differs from Handy, Soravo wins.

---

# 40. Upstream Sync Strategy

We should not continuously pull Handy's main branch into Soravo.

Instead:

```text
Handy upstream
      ↓
periodic audit
      ↓
candidate revision
      ↓
license/dependency review
      ↓
benchmark
      ↓
security review
      ↓
Soravo integration branch
      ↓
PR
```

This keeps Soravo stable.

---

# 41. What Happens to the Existing Soravo Code?

Do not delete existing code simply because Handy provides something similar.

For each existing Soravo subsystem:

1. compare it against Handy;
2. benchmark if performance-related;
3. inspect tests;
4. decide:
   - keep Soravo implementation;
   - replace with Handy implementation;
   - combine;
   - use Handy as reference only;
5. record the decision in the task/ADR.

This prevents unnecessary churn.

---

# 42. The Most Valuable Areas to Adopt First

If the objective is maximum time savings, prioritize:

### Tier 1 — Immediate reuse

1. audio capture
2. VAD
3. Parakeet runtime
4. Whisper runtime
5. text injection
6. clipboard
7. global hotkeys
8. model loading
9. Tauri/Rust foundation

### Tier 2 — Strong reuse

10. model management
11. settings persistence
12. history
13. diagnostics
14. updater foundation

### Tier 3 — Adapt/reference

15. transcript stabilization
16. UI architecture
17. state handling

### Tier 4 — Build independently

18. Supabase
19. Razorpay
20. entitlements
21. devices/sessions
22. admin
23. website
24. Soravo design system
25. commercial licensing behavior

---

# 43. The Most Important Technical Rule

The single most important rule should be:

> **Reuse mechanisms, not assumptions.**

Examples:

- Reuse audio capture, but enforce Soravo's real-time safety contract.
- Reuse Parakeet runtime, but benchmark it under Soravo's protocol.
- Reuse hotkeys, but enforce Soravo's transactional replacement semantics.
- Reuse clipboard injection, but enforce Soravo's committed-text boundary.
- Reuse model downloading, but enforce Soravo's checksum/manifest/rollback rules.
- Reuse settings storage, but implement Soravo's settings schema.
- Reuse updater plumbing, but implement Soravo's release/security process.

---

# 44. Expected Development Impact

Without Handy, an AI agent frequently has to solve:

```text
"How do we make macOS audio work?"
"How do we handle Windows devices?"
"How do we get global shortcuts?"
"How do we inject text?"
"How do we load Parakeet?"
"How do we load Whisper?"
"How do we manage models?"
"How do we handle clipboard?"
```

With Handy:

```text
"Which existing implementation solves this?"
"Does it satisfy Soravo?"
"What needs modification?"
"What tests prove it?"
```

This is a much smaller search space.

For a non-coder coordinating AI agents, that reduction in uncertainty is arguably as valuable as the raw code savings.

---

# 45. Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| License misunderstanding | High | exact revision + dependency audit |
| Model license issue | High | separate model provenance audit |
| Branding contamination | Medium | replace all Handy branding |
| Architecture mismatch | Medium | gap matrix |
| Hidden network behavior | Medium/high | network audit |
| Security mismatch | High | Soravo security gates |
| Upstream drift | Medium | controlled sync |
| Transcript behavior mismatch | High | Soravo state machine/tests |
| Performance regression | Medium | benchmark before/after |
| Over-reliance on Handy | Medium | Soravo interfaces |
| Fork becoming unmaintainable | Medium | modularize reused components |
| AI agent confusion | Medium | provenance docs + task mapping |

---

# 46. Recommended Final Architecture

The best outcome is **not a permanent fork-shaped codebase**.

The desired result is:

```text
Soravo
│
├── Soravo product layer
│   ├── account
│   ├── entitlements
│   ├── devices
│   ├── sessions
│   ├── settings
│   └── UI
│
├── Soravo dictation layer
│   ├── session
│   ├── transcript
│   ├── stabilization
│   ├── scheduler
│   └── typing
│
├── Hardened desktop foundation
│   ├── audio
│   ├── VAD
│   ├── hotkeys
│   ├── model management
│   └── platform integration
│
└── Local inference
    ├── Parakeet
    └── Whisper
```

Handy-derived components should become implementation details behind Soravo interfaces wherever practical.

---

# 47. Final Recommendation

**Yes: we should use Handy code extensively.**

The current Soravo architecture makes this unusually attractive because the two projects overlap at the deepest technical layer:

- same desktop framework family
- same Rust core approach
- same React/TypeScript direction
- same local-first philosophy
- same general STT problem
- same Parakeet/Whisper ecosystem
- same need for cross-platform audio
- same need for global hotkeys
- same need for text injection
- same need for model management

The correct approach is not a blind fork.

It is:

```text
HANDY MIT SOURCE
       ↓
LICENSE / DEPENDENCY / MODEL AUDIT
       ↓
ARCHITECTURE GAP AUDIT
       ↓
IMPORT BASELINE
       ↓
SORAVO TASK MAPPING
       ↓
REUSE + HARDEN
       ↓
SORAVO SECURITY / BENCHMARK / QA
       ↓
COMMERCIAL PRODUCT LAYER
       ↓
RELEASE
```

This should materially reduce the amount of desktop engineering Soravo needs.

The biggest expected benefit is that we stop spending AI-agent time reinventing mature platform-specific infrastructure and instead spend it on the parts that actually make Soravo a distinct product.

---

# 48. Immediate Next Steps

The recommended execution order is:

1. **Freeze the current Soravo specification as the authority.**
2. **Create ADR-015: Adopt Handy MIT Foundation.**
3. **Audit the exact Handy revision and its dependency/model licenses.**
4. **Create a Handy → Soravo gap matrix.**
5. **Import Handy into a dedicated integration branch.**
6. **Replace branding and application identifiers.**
7. **Run Handy's existing test/build baseline.**
8. **Map each affected Soravo task to existing Handy implementation.**
9. **Run the Soravo audio/STT benchmark harness.**
10. **Adopt the compatible audio/STT/model infrastructure.**
11. **Implement Soravo transcript semantics independently.**
12. **Implement Supabase/Razorpay/entitlement architecture independently.**
13. **Run full security and supply-chain review.**
14. **Run the Soravo DoD for every reused subsystem.**
15. **Only then proceed to release engineering.**

---

# 49. Source Basis

This report is based primarily on the current Soravo engineering specification files:

- `README.md`
- `01_PRD.md`
- `02_TDD.md`
- `03_AI_INSTRUCTIONS.md`
- `04_IMPLEMENTATION_PLAN.md`
- `05_TASK_BREAKDOWN.md`
- `06_DOD_QA.md`
- `07_AI_SKILLS.md`
- `08_MCP_AND_AGENT_TOOLING.md`
- `09_SECURITY_BASELINE.md`
- `10_ADR_INDEX.md`
- `11_INTERRUPTION_HANDOFF.md`
- `12_BENCHMARK_PROTOCOL.md`
- `13_RELEASE_RUNBOOK.md`
- `14_ENVIRONMENT_AND_SECRETS.md`
- `SPEC_MANIFEST.json`

External project verification:

- Handy GitHub repository: https://github.com/cjpais/Handy

The external Handy repository was used only to verify its current architecture, technology stack, and licensing/branding statements. The Soravo repository specification remains the authoritative source for Soravo requirements.

---

## Conclusion

Handy should be treated as a **major engineering accelerator**, not as Soravo itself.

The project should preserve the Soravo specification and use Handy wherever it already solves difficult, generic desktop problems. The highest-value reuse is in audio, VAD, local inference, hotkeys, typing, model infrastructure, and desktop plumbing. Soravo should independently own transcript semantics, security contracts, benchmarks, commercial infrastructure, account/entitlement logic, UX, and release policy.

If executed this way, Handy has the potential to remove a substantial fraction of the hardest desktop implementation work while preserving Soravo's ability to become a distinct, commercially distributed product.

---

## 🤖 INSTRUCTIONS FOR AI CODERS

When implementing Soravo V1 desktop features:

1. **First:** Read this document in full — it is the authoritative Handy reuse strategy
2. **Pin the Handy revision** before any code integration (exact commit SHA)
3. **Fork/rebase Handy** as the starting point — do NOT build desktop from scratch
4. **Audit before integrating:** provenance, licensing, dependencies, security
5. **Replace all Handy branding** with Soravo branding
6. **Keep Soravo-specific layers separate** from Handy foundation code
7. **Never skip security review** just because Handy "already works"
8. **Test on both macOS and Windows** before marking desktop tasks complete
9. **Document all deviations** from Handy's original implementation
10. **Rollback strategy:** If Handy integration fails, the Soravo spec (PRD/TDD) remains authoritative — revert to spec-driven implementation

### Rollback Strategy
- If Handy foundation proves unsuitable at any point, revert to the Soravo engineering specification as the authoritative guide
- The specification (PRD, TDD, Implementation Plan) describes the full system regardless of foundation choice
- Handy is an implementation optimization, not a specification change
- If rollback is triggered, update this document to reflect the decision and rationale
