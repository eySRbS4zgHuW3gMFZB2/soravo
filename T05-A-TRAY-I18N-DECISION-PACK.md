# T05-A — TRAY I18N DECISION PACK

**Date:** 2026-09-28
**Status:** Awaiting product decision — no implementation work proceeds until copy is supplied or scope is reduced.

---

## 1. Exact Locales Expected

| Locale | Purpose |
|--------|---------|
| `en` | English (required as source of truth per build.rs) |
| `zh-TW` | Traditional Chinese (fallback for zh-Hant, HK, MO) |
| `zh` | Simplified Chinese (fallback for zh-Hans) |
| `fr` | French |

These four locales are **fixed** by the tests in `tray_i18n.rs` (lines 59-78). Any other locale passed at runtime falls back to `en`.

---

## 2. Exact Keys Expected (8 total)

Each locale file must contain a `tray` object with these keys (derived from `tray.rs` usage and `build.rs` field validation):

| Key | Tray menu item (English) |
|-----|--------------------------|
| `settings` | "Settings" |
| `check_updates` | "Check for Updates" |
| `copy_last_transcript` | "Copy Last Transcript" |
| `quit` | "Quit" |
| `cancel` | "Cancel" (busy state menu) |
| `model` | "Model" (fallback label when no models downloaded) |
| `unload_model` | "Unload Model" |
| `secure_input_warning` | Warning text for macOS Secure Input blocked state |

---

## 3. Where Generated Data Is Consumed

| File | Location | Usage |
|------|----------|-------|
| `apps/desktop/src-tauri/src/tray.rs` | Line 459-594 | `build_menu()` calls `get_tray_translations()` and uses `strings.<key>` for all 8 keys |
| `apps/desktop/src-tauri/src/tray.rs` | Lines 465-477 | Secure Input warning entry conditionally uses `strings.secure_input_warning` with English fallback |

**Runtime flow:**
1. `build.rs` generates `tray_translations.rs` at compile time from locale JSONs
2. `tray_i18n.rs` includes the generated file and provides `get_tray_translations()`
3. `tray.rs` calls this function with the user's `app_language` setting (from `settings.rs`)
4. Returned `TrayStrings` struct provides localized menu labels

---

## 4. Runtime Behavior If Locale Data Exists

- Locale lookup order: exact match → language fallback (e.g., `zh-TW` for `zh-Hant-TW`) → English
- Missing keys in a non-English locale default to `""` (empty string)
- **Fallback behavior:** When a key is empty, `tray.rs` line 467-469 falls back to English for the secure_input_warning item
- All other menu items would display empty labels if their key is missing (no generic fallback)

---

## 5. Runtime Behavior If Tray Localization Is Removed/Disabled

**Option B path (disable localization, preserve tray):**
- Menu items use hardcoded English strings directly from `tray.rs`
- `build.rs` no longer reads locale files (or skips tray translation generation)
- `tray_i18n.rs` can be simplified to return static English strings
- Tray functionality (icon, menu structure, actions) remains unchanged
- All users see English-only tray labels

**Impact:**
- Non-English users see English menu labels (consistent with many apps)
- No product copy required
- No change to tray behavior, icon states, or menu actions

---

## 6. Option Analysis

### Option A: Provide Authoritative Locale Files

| Aspect | Details |
|--------|---------|
| **Files affected** | `apps/desktop/src/i18n/locales/{en,zh,zh-TW,fr}/translation.json` (4 new files) |
| **Behavior changed** | Non-English users see localized tray labels; `en` becomes source of truth |
| **Risks** | Product copy decisions required; 32 strings to author (4 locales × 8 keys); maintenance burden for future additions |
| **Tests required** | Update `tray_i18n.rs` tests pass; verify menu labels render correctly in each locale |
| **Product copy required** | **YES** — 32 string values must be authored with no existing source |

### Option B: Temporarily Disable Tray Localization

| Aspect | Details |
|--------|---------|
| **Files affected** | `tray.rs` (replace `strings.<key>` with hardcoded English), `build.rs` (remove `generate_tray_translations()` call), `tray_i18n.rs` (simplify to return static strings) |
| **Behavior changed** | All users see English-only tray labels; locale setting no longer affects tray |
| **Risks** | Non-English users may not understand menu items; future re-internationalization requires refactoring |
| **Tests required** | Update `tray_i18n.rs` tests to reflect English-only behavior; verify tray menu renders |
| **Product copy required** | **NO** — existing code comments/usage imply English labels |

### Option C: Redesign Tray Localization Source

| Aspect | Details |
|--------|---------|
| **Files affected** | `build.rs`, `tray_i18n.rs`, `tray.rs`, possibly frontend app if centralized i18n is adopted |
| **Behavior changed** | Depends on design (e.g., inline strings, shared frontend i18n, external resource file) |
| **Risks** | Architecture change; requires product input; may delay desktop build resolution |
| **Tests required** | Full refactor verification |
| **Product copy required** | **YES** — still need 32 string values regardless of storage mechanism |

### Option D: English-Only With Reduced Locale Test Set

| Aspect | Details |
|--------|---------|
| **Files affected** | `tray_i18n.rs` (remove non-English fallback tests), `tray.rs` (inline English strings) |
| **Behavior changed** | Tray ignores locale; always displays English |
| **Risks** | Same as Option B; test coverage reduced |
| **Tests required** | Remove/update locale fallback tests; verify English tray menu |
| **Product copy required** | **NO** |

---

## 7. Recommendations

**Fastest path to build unblock:** Option B or D (disable localization, hardcode English).

**Long-term if localization is required:** Option A (provide all 4 locales) with product owner authoring the 32 strings.

**Not recommended without product guidance:** Option C (redesign) — requires architectural decision beyond this task scope.

---

## 8. Verification Checklist

Once a decision is implemented:
- [ ] `cargo check -p soravo-desktop --all-targets` passes (no build script panic)
- [ ] Tray menu displays expected labels (localized or English-only as chosen)
- [ ] `tray_i18n.rs` tests pass
- [ ] Tray functionality (icon states, menu actions) unchanged

---

*Decision required from: Product owner / technical lead
*No source code has been modified per instructions.*
