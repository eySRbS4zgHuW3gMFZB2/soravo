# 18 — Desktop Architecture Matrix

**Version:** 3.0.0  
**Status:** Authoritative

---

## Subsystem Matrix

| Subsystem | Handy Implementation | Soravo Requirement | Action |
|---|---|---|---|
| Tauri v2 shell | tauri.conf.json, capabilities, build pipeline | Tauri v2 desktop | ADOPT with branding |
| React frontend | apps/desktop/src/, components | React + TypeScript UI | ADOPT with Soravo design |
| Rust core | apps/desktop/src-tauri/src/ | Rust Tauri commands/events | ADOPT, adapt to Soravo modules |
| Audio capture | audio_toolkit | Real-time capture, warm, pre-roll | ADAPT |
| VAD | vad-rs | Voice activity detection | REUSE |
| STT runtime | Parakeet/Whisper adapters | Local STT inference | ADAPT |
| Model manager | catalog/model-manager | Verified model installation | ADAPT |
| Global shortcuts | shortcut/HandyKeys | Configurable dictation hotkey | ADAPT |
| Typing/input | input/typing | Text injection (committed/final) | ADAPT |
| Clipboard | clipboard module | Clipboard preservation | REUSE |
| Overlay/pill | overlay | State-driven status indicator | REPLACE |
| Settings | settings/persistence | User preferences | REUSE |
| History | history module | Local-only dictation history | REUSE |
| Tray | tray | System tray integration | ADAPT |
| Diagnostics/actions | actions/mod.rs | Debug/diagnostic tools | REUSE |
| IPC/events | events.rs, commands.rs | Typed IPC semantics | KEEP SORAVO |
| Session state | session.rs | Authoritative state machine | KEEP SORAVO |
| Entitlements | N/A | Supabase-based licensing | NEW |
| Supabase integration | N/A | Account/entitlement backend | NEW |
| Razorpay integration | N/A | Payment processing | NEW |
| Security/capabilities | Partial | Least-privilege, CSP | ADAPT |
| Build system | Cargo.toml, package.json | Build automation | ADOPT |
| CI/CD | .github/workflows | Release automation | ADAPT |

---

## Implementation Notes

### KEEP SORAVO

These are Soravo-specific contracts that cannot come from Handy:
- session.rs: Authoritative state machine (IDLE → STARTING → LISTENING → TRANSCRIBING → FINALIZING → DONE → IDLE)
- events.rs: Typed IPC event semantics

### ADOPT

Adopt as-is with branding changes:
- Tauri shell structure
- Build pipelines
- React component architecture

### ADAPT

Reuse core implementation, modify for Soravo requirements:
- audio_toolkit: Add pre-roll, warm capture requirements
- shortcut/HandyKeys: Adapt to hold/toggle modes
- catalog/model-manager: Add Soravo manifest/checksum verification
- settings: Adapt to Soravo schema
- typing: Wrap in Soravo committed/final abstraction

### REPLACE

Soravo must implement:
- overlay/pill: Replace with Soravo state-driven UI
- Branding throughout (names, icons, tooltips, user-agent)

### NEW

Soravo-specific systems not in Handy:
- Entitlements
- Supabase integration
- Razorpay integration

---

## Branding Replacement Checklist

| Location | Current | Required |
|---|---|---|
| Product name | Handy | Soravo |
| Bundle ID | com.handy.* | com.soravo.desktop |
| Window title | Handy | Soravo |
| Tray tooltip | Handy v{} (Dev) | Soravo v{} (Dev) |
| User-Agent header | Handy | Soravo |
| Icons/assets | Handy | Soravo |
| LICENSE/Soravo notice | Soravo Engineering | Retain MIT notices |

---

## File Ownership

| Directory | Primary Owner | Notes |
|---|---|---|
| apps/desktop/ | Handy | Desktop application |
| apps/desktop/src-tauri/ | Handy | Tauri runtime |
| apps/desktop/src-tauri/src/ | Mixed | Core Rust code |
| apps/desktop/src-tauri/src/events.rs | Soravo | Typed IPC events |
| apps/desktop/src-tauri/src/session.rs | Soravo | State machine |
| apps/desktop/src/ | Soravo | React UI (replace branding) |
| supabase/ | Soravo | Database schema/migrations |
| services/license-api/ | Soravo | Payment backend |

---

## Integration Rules

1. **Soravo contracts never weaken to match Handy**
2. **Handy code must pass Soravo security baseline**
3. **Remove Handy branding before any release**
4. **Document provenance for all reused code**
5. **Keep Soravo session/events authoritative**
