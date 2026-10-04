# Soravo UI Integration Plan

**Version:** 2.0.0  
**Date:** 2026-09-26  
**Status:** Authoritative — **DEFERRED TO PHASE 14**  
**Source Task:** SORAVO-UI-FOUNDATION-011

---

## ⚠️ FUNCTIONALITY-FIRST NOTICE

**THIS PLAN IS FOR PHASE 14 ONLY.** Per the functionality-first strategy (SORAVO_PLAN.md, docs/spec-v3/04_IMPLEMENTATION_PLAN.md v3.1.0+), the UI overhaul described in this document **MUST NOT START** until:

- Phase 3 (Handy Foundation Adoption) complete
- Phase 4 (Soravo Desktop Integration) complete — functional contracts wired, all Handy UI retained
- Phase 5 (Session/Transcript Contract) complete
- Phase 6 (Model Manifest + Provenance) complete
- Phase 7 (STT Benchmark Lab) complete — real measurements, engine selected
- Phase 8 (Entitlements/Payments/Offline) complete
- Phase 9 (Security Audit) complete — no unresolved P0/P1
- Phase 10 (Full QA/E2E) complete — all tests pass

**Current Phase:** Phase 3–8 (Functionality-First Critical Path)  
**UI Overhaul Phase:** Phase 14 (starts AFTER Phase 10)

During Phases 3–10: **RETAIN all Handy UI as-is.** Only modify UI when strictly necessary to expose missing Soravo functionality. Branding-only updates (tray tooltip, icons) may be done in Phase 3.

---

## 1. Executive Summary

This document maps the existing Handy UI implementation (MIT-licensed, production-ready) to Soravo's desktop UX requirements. The strategy follows the **Handy Reuse Policy** (doc/spec-v3/15_HANDY_REUSE_POLICY.md): retain functioning Handy UI, apply Soravo branding/UX, and add Soravo-specific features.

**No broad visual redesign.** This plan identifies what to keep, modify, add, or remove.

---

## 2. Handy UI Inventory (As Implemented)

### 2.1 Pill / Floating Overlay
**Status:** ✅ **RETAIN** — Fully functional, production-ready

| Aspect | Implementation |
|--------|----------------|
| **Frontend** | `apps/desktop/src/components/pill.tsx` (129 lines) |
| **Backend** | `apps/desktop/src-tauri/src/overlay.rs` (892 lines) |
| **States** | `idle`, `listening`, `transcribing`, `finalizing`, `done`, `error` |
| **Modes** | Hold-to-talk, Toggle-to-talk (synced with hotkey config) |
| **Animations** | CSS pulse animation on listening state |
| **Positioning** | Top/Bottom, multi-monitor aware, cross-platform (macOS NSPanel, Windows HWND_TOPMOST, Linux GTK Layer Shell) |
| **Size Variants** | Compact (256×50) and Streaming (400×120) |
| **Audio Level** | Real-time mic level emission (throttled 30 FPS) |

**Soravo Compatibility:** Matches PRD §4.6 exactly. State machine aligns with Soravo session phases.

---

### 2.2 Model Selector
**Status:** ✅ **RETAIN** — Complete, catalog-driven

| Aspect | Implementation |
|--------|----------------|
| **Frontend** | `apps/desktop/src/components/settings/model-settings.tsx` (143 lines) |
| **Backend** | `apps/desktop/src-tauri/src/managers/model.rs` (1250+ lines), `catalog/mod.rs` |
| **Engine Selection** | Dropdown: Whisper, Parakeet, Local (transcribe.cpp, Moonshine, SenseVoice, GigaAM, Canary, Cohere) |
| **Model Selection** | Cascading dropdown per engine |
| **Status Display** | `not_installed`, `downloading`, `verifying`, `ready`, `error` |
| **Availability Toggle** | Checkbox to enable/disable model |
| **Metadata** | Accuracy/speed scores, languages, streaming support, translation support, recommended badge |
| **Download/Verify** | HTTP + HF Hub, SHA-256, atomic install, rollback on failure |
| **Auto-discovery** | Custom models dir + shared HF cache scan |

**Soravo Compatibility:** Exceeds PRD §4.8. Catalog already includes all candidate engines.

---

### 2.3 Model Management UI (Backend)
**Status:** ✅ **RETAIN** — Comprehensive

| Component | File | Capability |
|-----------|------|------------|
| Model Manager | `managers/model.rs` | Registry, download, verification, capability probing |
| Catalog | `catalog/mod.rs` | Static model descriptors with capabilities |
| Download | `managers/model/download.rs` | HTTP/HF streaming, progress events, stall detection |
| Capability Probe | `managers/model_capabilities.rs` | GGUF header parsing for streaming, languages, translation |

---

### 2.4 Settings
**Status:** ✅ **RETAIN** — Complete settings shell with 5 implemented sections

| Section | Frontend | Backend (settings.rs) | Status |
|---------|----------|----------------------|--------|
| Overview | `settings-layout.tsx` | — | ✅ Placeholder content |
| General | `general-settings.tsx` | Schema version, migration | ✅ |
| Microphone | `microphone-settings.tsx` | Device, auto-fallback, channel | ✅ |
| Shortcut | `shortcut-settings.tsx` | Binding, mode, record UI | ✅ |
| Models | `model-settings.tsx` | Engine, model, status | ✅ |
| Privacy | `settings-layout.tsx` | — | ⚠️ Placeholder only |
| Diagnostics | `settings-layout.tsx` | — | ⚠️ Placeholder only |

**Settings Schema** (`settings.rs:362-517`): 100+ fields covering hotkeys, audio, model, language, overlay, post-processing, shortcuts, updates, privacy, experimental.

---

### 2.5 Shortcut / Hotkey UI
**Status:** ✅ **RETAIN** — Full recorder UI

| Feature | Implementation |
|---------|----------------|
| Enable/Disable | Checkbox |
| Mode Select | Hold-to-talk / Toggle-to-talk dropdown |
| Current Binding | Display (e.g., "Option+Space") |
| Record New | Button enters recording mode, captures combo |
| Validation | Invalid combos rejected, conflicts detected |
| Persistence | Transactional replace (old stays if new fails) |

**Backend:** `shortcut/handy_keys.rs`, `shortcut/mod.rs`, `settings.rs` (ShortcutActivation, HoldThreshold)

---

### 2.6 Microphone / Audio UI
**Status:** ✅ **RETAIN** — Functional device selector

| Feature | Implementation |
|---------|----------------|
| Device List | Dropdown (System Default + enumerated devices) |
| Status Indicator | Green/red "Available"/"Not Available" |
| Auto Fallback | Checkbox for auto-switch on disconnect |
| Channel Selection | In settings schema (no UI yet) |
| Clamshell Mic | In settings schema (no UI yet) |

**Backend:** `audio_toolkit` (VAD, ring buffer, pre-roll), `managers/audio.rs`

---

### 2.7 Transcription Controls
**Status:** ✅ **RETAIN** — Session lifecycle UI

| Feature | Implementation |
|---------|----------------|
| Session Phase Display | `IDLE`, `STARTING`, `LISTENING`, `TRANSCRIBING`, `FINALIZING`, `DONE`, `ERROR` |
| Start Session | Button (enabled at IDLE) |
| End Session | Button (enabled when active) |
| Session ID | Displayed when active |
| Pill Integration | Floating overlay mirrors state |

**Backend:** `session.rs` (authoritative Soravo state machine), `transcription_coordinator.rs`

---

### 2.8 History
**Status:** ✅ **RETAIN** — Local SQLite with retention

| Feature | Implementation |
|---------|----------------|
| Storage | SQLite (`history.db`) with migrations |
| Fields | ID, file_name, timestamp, saved, title, transcription, post_processed, prompt |
| Retention | Never / Preserve Limit / 3 Days / 2 Weeks / 3 Months |
| Saved Toggle | Pin/unpin entries |
| Delete | Entry + WAV file cleanup |
| Tray Integration | "Copy Last Transcript" menu item |

**Backend:** `managers/history.rs` (737 lines), `commands/history.rs`

---

### 2.9 System Tray
**Status:** ✅ **RETAIN** — Sophisticated diff-based updater

| Feature | Implementation |
|---------|----------------|
| Icon States | Idle, Recording, Transcribing (per-theme: Dark/Light/Colored) |
| Secure Input Warning | macOS banner entry |
| Model Submenu | Check items for downloaded models, active highlighted |
| Unload Model | Enabled when model loaded |
| Copy Last Transcript | Clipboard integration |
| Settings | Opens settings window |
| Check Updates | Respects `HANDY_DISABLE_UPDATER` |
| Quit | Platform accelerator |
| Tooltip | Version string ("Handy v{version}") |

**Backend:** `tray.rs` (744 lines) — coalesced apply, sequence-gated, macOS recreation recovery

---

### 2.10 Onboarding
**Status:** ✅ **RETAIN** — Flag-based with auto-model selection

| Feature | Implementation |
|---------|----------------|
| Flag | `onboarding_completed` in settings |
| Migration | Auto-set true if `selected_model` exists |
| Auto-select | `ModelManager::auto_select_model_if_needed()` picks recommended downloaded model |

---

### 2.11 Account / Profile UI
**Status:** ✅ **RETAIN (NEEDS ENHANCEMENT)** — Basic auth panel

| Feature | Implementation |
|---------|----------------|
| Sign In | `accountSignIn()` IPC → Opens browser OAuth |
| Sign Out | `accountSignOut()` IPC |
| State Display | `SignedOut`, `SignedIn`, `NeedsRefresh`, `Unavailable` |
| Entitlement | Shows "Active"/"Inactive" |
| Offline Mode | Graceful degradation message |
| User ID | Displays `user_id` from snapshot |

**Backend:** `account.rs`, `ipc.ts` (AccountSnapshot, AccountState)

---

### 2.12 Subscription / Entitlement UI
**Status:** ⚠️ **PARTIAL** — Only entitlement_active boolean displayed

| Current | Missing (Soravo PRD §4.9) |
|---------|---------------------------|
| `entitlement_active` boolean | Plan name (Free/Pro/Lifetime) |
| | Feature matrix per plan |
| | Upgrade/downgrade entry point |
| | Payment management link |
| | Device list / active sessions |
| | Lifetime license badge |

**Backend:** `account.rs` returns minimal `AccountSnapshot`; Supabase entitlements in migrations but no desktop UI.

---

### 2.13 Update / Download UI
**Status:** ✅ **RETAIN (NEEDS BRANDING)** — Functional

| Feature | Implementation |
|---------|----------------|
| Auto-check Toggle | `update_checks_enabled` in settings |
| What's New on Update | `show_whats_new_on_update` flag + `whats_new_last_seen_version` |
| Tray Menu Item | "Check Updates" (disabled when forced off) |
| Forced Disable | `HANDY_DISABLE_UPDATER` env (Nix) |

**Missing:** Update channel selector (stable/beta), changelog viewer, manual check button in settings.

---

## 3. Soravo Branding — Required Modifications

### 3.1 Product Identity (Already Correct)
| Item | Current | Required |
|------|---------|----------|
| App Name | "Soravo" (tauri.conf.json, app.tsx, settings-layout.tsx) | ✅ Soravo |
| Bundle ID | `com.soravo.desktop` | ✅ Soravo |
| Window Title | "Soravo" | ✅ Soravo |

### 3.2 Branding Requiring Update
| Location | File | Current | Required |
|----------|------|---------|----------|
| Tray Tooltip | `tray.rs:446-452` | `"Handy v{} (Dev)"` | `"Soravo v{} (Dev)"` |
| Portable Mode | `portable.rs` | `"Handy Portable Mode"` | `"Soravo Portable Mode"` |
| Tray Icons | `overlay.rs:191-215` | `handy.png`, `recording.png` | Soravo-branded icons |
| User-Agent | Network requests | Likely "Handy" | "Soravo" |
| Icon Assets | `src-tauri/icons/` | Handy icons | Soravo icons |

---

## 4. Design System — Required Modifications

### 4.1 Current State
- Custom CSS in `apps/desktop/src/styles.css` (125 lines)
- Green accent (`#10b981`, `#69cf8a`, `#f17c4f` orange accent)
- Dark theme base (`#101914`, `#15251d`)
- Inter font
- No design token system

### 4.2 Soravo Requirements
- Soravo color palette (to be defined)
- Design tokens for: colors, spacing, typography, radii, shadows
- shadcn/ui components already available (Button, Card) — extend with Soravo theme
- Consistent with website (`apps/website/src/styles.css`)

---

## 5. New Soravo UI — Required Additions

### 5.1 Enhanced Account Panel
**Priority:** HIGH (PRD §4.9 Website settings/account)

| New Feature | Description | Backend Needed |
|-------------|-------------|----------------|
| Email Display | Show authenticated email | Extend `AccountSnapshot` |
| Plan Display | "Free" / "Pro" / "Lifetime" badge | Entitlement tier in snapshot |
| Feature Matrix | Expandable list of plan features | Static config or API |
| Manage Subscription | Button → opens web billing portal | URL from backend |
| Device List | Show registered devices | `devices` table from Supabase |
| Active Sessions | Show current sessions | `sessions` table from Supabase |
| Change Password | Button → web account page | Supabase Auth |
| Sign Out All Devices | Revoke all sessions | Supabase Admin API |

**Files to Modify:**
- `apps/desktop/src/components/account-panel.tsx` (expand)
- `apps/desktop/src/ipc.ts` (extend AccountSnapshot)
- `apps/desktop/src-tauri/src/account.rs` (extend snapshot)

---

### 5.2 Soravo-Specific Settings Sections
**Priority:** HIGH (PRD §4.9 Desktop settings)

| Section | Fields to Add | Backend |
|---------|---------------|---------|
| **Privacy** (implement placeholder) | Local-first notice, data retention policy link, telemetry opt-out (already none), crash reporting toggle | Settings schema additions |
| **Diagnostics** (implement placeholder) | Log viewer, export logs, performance metrics, microphone test, shortcut test | `commands/mod.rs` additions |
| **Account** (new section) | Plan, subscription management, devices, sessions | See 5.1 |
| **Advanced** | Custom vocabulary UI, post-processing config, update channel (stable/beta) | Settings schema already has fields |

---

### 5.3 Soravo Onboarding Flow
**Priority:** MEDIUM (PRD §4.1, §4.2)

| Step | Description | Implementation |
|------|-------------|----------------|
| 1. Welcome | Soravo brand, core promise | New React component |
| 2. Shortcut Setup | Record global hotkey, explain hold/toggle | Extend `shortcut-settings.tsx` wizard mode |
| 3. Microphone Test | Select device, test level, auto-fallback | Extend `microphone-settings.tsx` wizard mode |
| 4. Model Selection | Pick recommended model, download | Extend `model-settings.tsx` wizard mode |
| 5. Privacy & Entitlements | Local-first, account benefits, plan selection | New component + Account panel link |
| 6. Complete | Mark `onboarding_completed`, open main UI | Set flag, navigate |

**Backend:** `onboarding_completed` flag exists; need wizard state machine.

---

### 5.4 Subscription / Entitlement UI
**Priority:** HIGH (PRD §4.9, Product Goal #7)

| Component | Description |
|-----------|-------------|
| Plan Card | Visual card: Free / Pro / Lifetime with feature checkmarks |
| Upgrade CTA | "Upgrade to Pro" button → web checkout |
| Manage Billing | "Manage Subscription" → Stripe/Razorpay portal |
| Lifetime Badge | Prominent "Lifetime" indicator |
| Trial Status | Days remaining, trial conversion prompt |
| Device Limit | Show "X of Y devices used" |

**Integration Points:**
- Settings → Account section
- Tray menu → "Account" / "Subscription"
- Pill/Overlay → Subtle plan indicator (optional)

---

### 5.5 Privacy / Security Messaging
**Priority:** MEDIUM (PRD Core Promise: "keeps audio and transcripts private")

| Location | Message |
|----------|---------|
| Settings → Privacy | "Your audio and transcripts never leave this device. No cloud processing." |
| Onboarding Step 5 | "Soravo is local-first. We don't see your dictation." |
| Account Panel | "Entitlements enable sync/features — not cloud transcription." |
| Tray Tooltip | "Soravo — Local dictation" |

---

### 5.6 Soravo Icons / Assets
**Priority:** HIGH (Handy Reuse Policy §4.1)

| Asset | Current | Required |
|-------|---------|----------|
| App Icon | `icons/icon.png` (Handy) | Soravo logo |
| Tray Icons | `handy.png`, `recording.png`, `transcribing.png` | Soravo variants (idle/recording/transcribing) |
| DMG/Installer | Handy icons | Soravo icons |
| Splash/Onboarding | None | Soravo illustrations |

---

## 6. Component / File Mapping

### 6.1 Retained — No Changes Needed During Phases 3–10 (Functional Core)

**THESE ARE RETAINED AS-IS DURING FUNCTIONALITY-FIRST PHASES (3–10).** They will be redesigned in Phase 14.

| Soravo Feature | Handy Source File(s) | Notes |
|----------------|----------------------|-------|
| Pill Overlay | `src/components/pill.tsx`, `src-tauri/src/overlay.rs` | Core UX — retain entirely (Phase 3–10), redesign Phase 14 |
| Model Selector | `src/components/settings/model-settings.tsx`, `src-tauri/src/managers/model.rs` | Full catalog — retain (Phase 3–10), redesign Phase 14 |
| Model Management | `src-tauri/src/managers/model.rs`, `src-tauri/src/catalog/mod.rs` | Download, verify, probe — retain |
| Shortcut Config | `src/components/settings/shortcut-settings.tsx`, `src-tauri/src/shortcut/` | Recorder, modes — retain (Phase 3–10), redesign Phase 14 |
| Microphone Config | `src/components/settings/microphone-settings.tsx`, `src-tauri/src/audio_toolkit/` | Device, fallback — retain (Phase 3–10), redesign Phase 14 |
| Session Controls | `src/app.tsx`, `src-tauri/src/session.rs` | Soravo state machine authoritative |
| History | `src-tauri/src/managers/history.rs`, `src-tauri/src/commands/history.rs` | Local SQLite — retain (Phase 3–10), redesign Phase 14 |
| Tray | `src-tauri/src/tray.rs` | Diff-based updater — retain (Phase 3–10), redesign Phase 14 |
| Settings Shell | `src/components/settings/settings-layout.tsx`, `src-tauri/src/settings.rs` | Schema, storage — retain (Phase 3–10), redesign Phase 14 |
| Account Auth | `src/components/account-panel.tsx`, `src-tauri/src/account.rs` | Base auth — retain, extend (Phase 3–10), redesign Phase 14 |
| Updates | `src-tauri/src/settings.rs` (update_checks*), `src-tauri/src/tray.rs` | Auto-check, tray — retain, rebrand |
| Onboarding | `src-tauri/src/settings.rs` (onboarding_completed) | Flag-based — retain (Phase 3–10), replace with wizard Phase 14 |

---

### 6.2 Modified — Branding / UX Refinement

| Component | Files | Changes |
|-----------|-------|---------|
| Tray Tooltip | `src-tauri/src/tray.rs:446-452` | "Handy v{}" → "Soravo v{}" |
| Portable Mode String | `src-tauri/src/portable.rs` | "Handy Portable Mode" → "Soravo Portable Mode" |
| Tray Icons | `src-tauri/src/overlay.rs:191-215`, `src-tauri/icons/` | Replace Handy PNGs with Soravo |
| Design Tokens | `src/styles.css` | Replace green theme with Soravo palette |
| Logo Mark | `src/app.tsx:108`, `src/components/settings/settings-layout.tsx:62` | Already "Soravo" — verify consistency |

---

### 6.3 New — Soravo-Specific Additions

| Feature | New Files | Modified Files |
|---------|-----------|----------------|
| Enhanced Account Panel | — | `src/components/account-panel.tsx`, `src/ipc.ts`, `src-tauri/src/account.rs` |
| Privacy Settings Section | `src/components/settings/privacy-settings.tsx` | `src/components/settings/settings-layout.tsx` |
| Diagnostics Settings Section | `src/components/settings/diagnostics-settings.tsx` | `src/components/settings/settings-layout.tsx` |
| Account Settings Section | `src/components/settings/account-settings.tsx` | `src/components/settings/settings-layout.tsx` |
| Onboarding Wizard | `src/components/onboarding/` (new dir) | `src/app.tsx`, `src-tauri/src/settings.rs` |
| Subscription/Plan UI | `src/components/subscription/` (new dir) | `src/components/account-panel.tsx` |
| Soravo Design System | `src/design-tokens.css` (new), extend `src/styles.css` | All UI components |
| Soravo Icons | `src-tauri/icons/` (replace) | `src-tauri/src/overlay.rs`, `src-tauri/tauri.conf.json` |

---

### 6.4 Removed — None

**No Handy UI components are removed.** All functional UI is retained per reuse policy.

---

## 7. Reason for Each Change

| Change | Category | Reason |
|--------|----------|--------|
| Retain Pill/Overlay | Functional | Matches PRD §4.6 exactly; battle-tested cross-platform |
| Retain Model Selector | Functional | Exceeds PRD §4.8; catalog-driven, multi-engine |
| Retain Settings Shell | Functional | Complete schema, Tauri store persistence, migrations |
| Retain Shortcut UI | Functional | Recorder, conflict detection, transactional replace |
| Retain Microphone UI | Functional | Device enum, auto-fallback, channel support in schema |
| Retain History | Functional | SQLite, retention policies, tray integration |
| Retain Tray | Functional | Coalesced diff-based updates, macOS recreation recovery |
| Retain Account Auth | Functional | OAuth flow, offline mode, entitlement flag |
| Update Tray Tooltip | Branding | "Handy v{}" leaks Handy identity (Policy §4.1) |
| Update Portable String | Branding | "Handy Portable Mode" leaks Handy identity |
| Replace Tray Icons | Branding | Icons are visual identity (Policy §4.1) |
| Replace Design Tokens | Branding | Green theme is Handy visual identity |
| Add Plan Display | Soravo Feature | PRD §4.9 requires plan/entitlement visibility |
| Add Subscription Management | Soravo Feature | Product Goal #7: customer dashboard entry |
| Add Privacy Panel | Soravo Feature | PRD §4.9: privacy information; Core Promise |
| Add Diagnostics Panel | Soravo Feature | PRD §4.9: diagnostics; professional users need visibility |
| Add Onboarding Wizard | Soravo Feature | PRD §4.1, §4.2: warm pipeline, shortcut setup |
| Add Soravo Icons | Branding | Policy §4.1: all visual identity must be Soravo |

---

## 8. Implementation Phases (PHASE 14 — DEFERRED)

**THESE PHASES ARE FOR PHASE 14 ONLY. DO NOT START UNTIL FUNCTIONAL DESKTOP IS COMPLETE (POST-PHASE 10).**

### Phase 14.1: Branding Cleanup (Week 1)
- [ ] Update tray tooltip: "Handy" → "Soravo"
- [ ] Update portable mode string
- [ ] Replace tray/icon assets with Soravo variants
- [ ] Verify no "Handy" strings in user-visible UI

### Phase 14.2: Design System (Week 1-2)
- [ ] Define Soravo design tokens (colors, spacing, radii, typography)
- [ ] Apply to `styles.css` and shadcn/ui components
- [ ] Ensure consistency with website (`apps/website/src/styles.css`)

### Phase 14.3: Account Panel Enhancement (Week 2)
- [ ] Extend `AccountSnapshot` with email, plan, devices, sessions
- [ ] Enhance `account-panel.tsx` with plan card, manage subscription CTA
- [ ] Add "Account" section to settings navigation

### Phase 14.4: Settings Completion (Week 2-3)
- [ ] Implement Privacy section (local-first messaging, links)
- [ ] Implement Diagnostics section (log viewer, mic test, shortcut test)
- [ ] Add Custom Vocabulary UI (settings schema already has field)
- [ ] Add Update Channel selector (stable/beta)

### Phase 14.5: Onboarding Wizard (Week 3)
- [ ] Create wizard components (welcome, shortcut, mic, model, privacy, complete)
- [ ] Integrate with existing settings components (reuse shortcut/mic/model UI)
- [ ] Gate on `onboarding_completed` flag

### Phase 14.6: Subscription/Entitlement UI (Week 3-4)
- [ ] Plan display cards in Account section
- [ ] "Manage Subscription" → web portal link
- [ ] Device/session list in Account section
- [ ] Lifetime badge, trial status

### Phase 14.7: Privacy Messaging (Week 4)
- [ ] Add local-first copy to Privacy settings, Onboarding, Account panel
- [ ] Update tray tooltip to "Soravo — Local dictation"

---

## 9. Acceptance Criteria

| Criterion | Verification |
|-----------|--------------|
| No "Handy" in user-visible UI | Grep for "Handy" in `src/` and `src-tauri/` — only in comments/licenses |
| Tray tooltip shows "Soravo v{}" | Run app, hover tray icon |
| Account panel shows plan + manage link | Sign in, verify plan badge and CTA |
| Privacy section implemented | Settings → Privacy shows local-first messaging |
| Diagnostics section implemented | Settings → Diagnostics shows log export, mic test |
| Onboarding wizard completes | Fresh install → wizard runs → `onboarding_completed=true` |
| Design tokens applied | Visual consistency with website; no hardcoded Handy greens |
| Soravo icons used | App icon, tray icons, installer all Soravo-branded |
| All retained Handy UI functional | Regression test: shortcut, model, mic, history, tray, overlay |

---

## 10. Out of Scope (Future Work)

- Visual redesign beyond design token application
- Advanced onboarding animations
- In-app subscription purchase (web-only per PRD)
- Team/organization account UI
- Advanced diagnostics (profiling, benchmarks)
- Localization/i18n beyond existing `app_language` setting

---

## 11. References

- [Handy Reuse Policy](15_HANDY_REUSE_POLICY.md)
- [Handy Migration Status](16_HANDY_MIGRATION_STATUS.md)
- [Product Requirements Document](01_PRD.md)
- [Desktop Architecture](18_DESKTOP_ARCHITECTURE.md)
- [ADR-027: Handy-Derived Desktop Foundation](decisions/ADR-027-handy-derived-desktop-foundation.md)

---

*End of SORAVO_UI_INTEGRATION_PLAN.md*