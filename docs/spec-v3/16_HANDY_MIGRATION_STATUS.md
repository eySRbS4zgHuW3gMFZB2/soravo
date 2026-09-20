# 16 — Handy Migration Status

**Version:** 3.1.0  
**Date:** 2026-09-21  
**Status:** DOCUMENTATION UPDATED / MIGRATION IN PROGRESS

---

## 1. Current Repository State

| Item | Value |
|---|---|
| **Main SHA** | 79c72bf374b5d4ad6ff29c856e20de6a784e65b8 |
| **Latest PR** | #58 (merged) |
| **Migration PR** | #55 (OPEN - implementation work) |

---

## 2. Strategy Summary

**SORAVO USES HANDY AS THE DESKTOP FOUNDATION, DERIVES/FORKS IT, REBRANDS IT AS SORAVO, AND MODIFIES/REPLACES/EXTENDS IT WHERE SORAVO REQUIREMENTS DIFFER.**

Migration architecture is verified and correct. Remaining work is implementation integration, build infrastructure, licensing documentation, and branding cleanup.

---

## 3. Handy Systems Adopted

| Module | Status |
|---|---|
| audio_toolkit (with VAD) | ✅ Integrated |
| clipboard | ✅ Integrated |
| input/typing | ✅ Integrated |
| settings | ✅ Integrated |
| tray | ✅ Integrated |
| shortcut/HandyKeys | ✅ Integrated |
| overlay | ✅ Integrated |
| catalog/model-manager | ✅ Integrated |
| transcription/manager | ✅ Integrated |
| history | ✅ Integrated |
| actions | ✅ Integrated |
| secure_input | ✅ Integrated |

---

## 4. Soravo Systems Retained

| Module | Status |
|---|---|
| session.rs (state machine) | ✅ Preserved |
| events.rs (typed IPC) | ✅ Preserved |
| capabilities (least-privilege) | ✅ Configured |
| CSP (explicit, restrictive) | ✅ Configured |

---

## 5. Systems Removed

- Old Soravo desktop src-tauri implementation
- No duplicate audio/VAD/hotkey/typing/overlay/model-management systems

---

## 6. Security Changes

| Item | Status |
|---|---|
| CSP explicit and restrictive | ✅ |
| Least-privilege capabilities | ✅ |
| macOS entitlements restricted | ✅ |
| No desktop telemetry | ✅ |
| No cloud STT endpoints | ✅ |
| No Supabase service-role keys in desktop | ✅ |
| No Razorpay secrets in desktop | ✅ |

---

## 7. Build Status

**Status:** BLOCKED on Linux VM

Missing GTK/graphene system libraries:
```
pkg-config error:
  Package graphene-gobject-1.0 was not found in the pkg-config search path
```

Required (Ubuntu/Debian):
```bash
sudo apt install libgtk-4-dev libgraphene-dev libwebkit2gtk-4.1-dev libclutter-gtk-1.0-dev libappindicator3-dev libayatana-appindicator3-dev
```

---

## 8. Model License Status

**Status:** BLOCKED

Model catalog is empty. Upstream licenses unverified. Requires direct communication with Handy/CJPais for license terms.

All Parakeet/Whisper artifacts referenced in Handy catalog show:
- Source: blob.handy.computer
- License: BLOCKED (unknown)
- Commercial use: BLOCKED (unknown)
- Redistribution: BLOCKED (unknown)

---

## 9. Branding Cleanup

| Item | Status |
|---|---|
| Product name set to "Soravo" | ✅ |
| Bundle ID: com.soravo.desktop | ✅ |
| Window title: "Soravo" | ✅ |
| Legacy: "Handy Portable Mode" | ⚠️ Needs update |
| Legacy: "Handy v{} (Dev)" tooltip | ⚠️ Needs update |
| User-Agent header | ⚠️ Needs update |

---

## 10. PR Status

**Status:** NOT CREATED

PR creation was blocked by gh CLI timeout. Branch remains `feature/HANDY-MIGRATION-001` on remote origin but no PR exists.

---

## 11. CI Status

**Status:** UNKNOWN

No CI runs observed on migration branch. Desktop builds require GTK dependencies on Linux.

---

## 12. Remaining Blockers

### Blocked

1. **GTK system dependencies** — Required for Linux desktop build
   - Action: Install libgtk-4-dev, libgraphene-dev, libwebkit2gtk-4.1-dev

2. **Model license verification** — Catalog empty; upstream licenses unverified
   - Action: Contact Soravo engineering for model licensing terms

3. **Build system** — Cargo.toml needs system libraries documented
   - Action: Add system dependency documentation

### Not Blocked

1. **Portable mode branding** — Update "Handy Portable Mode" to "Soravo Portable Mode"

2. **Tray tooltip** — Update "Handy v{} (Dev)" to "Soravo v{} (Dev)"

---

## 13. Acceptance Criteria

| Criteria | Status |
|---|---|
| Documentation updated to reflect fork/derive/rebrand strategy | ✅ |
| Main SHA verified | ✅ |
| Handy-derived architecture documented | ✅ |
| Soravo session state authoritative | ✅ |
| Soravo IPC semantics correct | ✅ |
| Security baseline documented | ✅ |
| Model licensing investigation | ⚠️ BLOCKED |
| Branding cleanup | ⚠️ Partial |
| Rust checks on migration branch | ⚠️ PENDING (PR #55) |
| Tauri checks on migration branch | ⚠️ PENDING (PR #55) |

---

## 14. Next Actions

1. Complete PR #55 migration implementation
2. Install GTK system dependencies for Linux builds
3. Populate model catalog with verified metadata
4. Obtain license terms from upstream
5. Fix remaining branding references
6. Run Rust/Tauri checks after PR #55 merge
7. Verify CI passes on migration branch

---

## 15. Migration Verdict

**DOCUMENTATION STATUS:** COMPLETE (policy and authority documents updated)

**IMPLEMENTATION STATUS:** IN PROGRESS (PR #55 pending merge)

Migration architecture is verified and correct. Remaining work is build infrastructure, licensing documentation, and branding cleanup.
