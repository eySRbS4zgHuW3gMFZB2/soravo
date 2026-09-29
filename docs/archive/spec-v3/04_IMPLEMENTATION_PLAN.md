# 04 — Implementation Plan

**Version:** 3.0.0  
**Status:** Authoritative

---

## Phase 0 — Foundation / Documentation

**Objective:** Document V3 architecture, archive V2, establish migration state.

Deliver:
- V3 specification pack (docs/spec-v3/)
- V2 archive (docs/spec-v2-archive/)
- HANDY-MIGRATION-001 branch verified
- GTK dependencies documented
- Model license verification initiated

Exit:
- Documentation complete
- Repository structure correct
- V2 preserved but superseded

---

## Phase 1 — Website

**Objective:** Build public product website.

Build:
- landing
- features
- pricing
- FAQ
- download
- privacy
- terms
- refund/cancellation
- contact/support
- responsive layout
- shadcn design system
- Umami

Exit:
- legitimate public website
- analytics events contain no private dictation data
- accessibility baseline passes

---

## Phase 2 — Cloud/Auth/Entitlements

**Objective:** Build Supabase and payment infrastructure.

Build:
- Supabase Auth
- profile
- entitlement schema
- devices
- sessions
- RLS
- role model
- password reset/change
- logout
- user dashboard
- admin dashboard
- admin metrics
- Razorpay server integration
- webhook verification
- idempotency
- signed entitlement

Exit:
- user cannot access another user's data
- non-admin cannot access admin routes/data
- RLS/security tests pass
- sandbox payment lifecycle passes

---

## Phase 3 — Handy Foundation Adoption

**Objective:** Complete Handy integration.

Complete:
- GTK system dependencies installed (Linux)
- Build verification (Linux)
- Branding cleanup (portable mode, tray, user-agent)
- PR creation and merge

Exit:
- Handy branch merged to main
- Build passes on Linux
- All branding replaced with Soravo
- PR merged

---

## Phase 4 — Soravo Desktop Integration

**Objective:** Integrate Soravo-specific requirements with Handy foundation.

Build:
- Soravo session state machine integration
- Typed IPC events
- Settings adaptation
- Account/entitlement UI integration
- Diagnostics adaptation

Exit:
- Soravo contracts wired into Handy foundation
- UI reflects Soravo requirements

---

## Phase 5 — Session/Transcript Contract

**Objective:** Implement Soravo-specific transcript semantics.

Build:
- session IDs
- tentative/committed/final transcript states
- stabilization
- stale-result rejection
- finalization

Exit:
- no duplicate committed text
- no old-session injection

---

## Phase 6 — Model Manifest + Provenance

**Objective:** Verify model licenses and populate catalog.

Build:
- Contact Handy/CJPais for model licenses
- Document license terms
- Populate model catalog
- Checksum verification
- Manifest schema

Exit:
- All models VERIFIED or BLOCKED with documented reasons
- Model catalog complete

---

## Phase 7 — STT Benchmark Lab

**Objective:** Benchmark and select production engine.

Build:
- benchmark harness
- Parakeet adapter verification
- Whisper adapter verification
- latency measurement
- resource measurement
- stability testing

Exit:
- documented engine choice
- ADR
- reproducible benchmark

---

## Phase 8 — Soravo UX / Product Differentiation

**Objective:** Replace Handy UI with Soravo design.

Build:
- Soravo design system
- floating pill (state-driven)
- onboarding
- settings UX
- account UI
- entitlement UX
- diagnostics

Exit:
- Soravo branding complete
- UI is Soravo (not Handy)

---

## Phase 9 — Security / Supply Chain

**Objective:** Complete security audit.

Run:
- dependency audit
- secret scan
- static analysis
- Tauri capability review
- CSP review
- supply-chain review
- TestSprite security-focused run

Exit:
- no unresolved P0/P1 security issue

---

## Phase 10 — Full QA / E2E

**Objective:** Complete testing.

Run:
- unit suite
- integration suite
- desktop smoke
- performance tests
- long-session soak
- device reconnect tests
- TestSprite full sweep

Exit:
- all tests pass
- no P0/P1 bugs

---

## Phase 11 — Payments / Licensing

**Objective:** Complete payment/entitlement system.

Build:
- device activation
- offline entitlement cache
- entitlement verification

Exit:
- sandbox payment lifecycle passes
- revoked entitlement behavior defined

---

## Phase 12 — Release Engineering

**Objective:** Set up build and release pipeline.

Build:
- macOS CI
- Windows CI
- artifact checksums
- GitHub Release automation
- fresh-machine test
- release notes

Exit:
- install from a clean machine

---

## Phase 13 — Release Candidate

**Objective:** Final release preparation.

Run:
- complete test suite
- TestSprite release run
- security review
- website review
- payment sandbox verification
- account/dashboard review
- release package validation

Exit:
- release checklist green
- V1 ready for public release

---

## Phase 14 — Post-Release

**Objective:** Ongoing maintenance.

Maintain:
- dependency updates
- security patches
- user feedback integration

---

## Handy Reuse Requirement

Every task in the DESKTOP, AUDIO, STT, HOTKEY/PILL, TYPING, MODELS, and SETTINGS/HISTORY sections MUST complete a Handy reuse audit before marking done.

See `03_AI_INSTRUCTIONS.md` section 9 for the full policy.
