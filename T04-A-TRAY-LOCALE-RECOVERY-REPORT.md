# T04-A — TRAY LOCALE RECOVERY REPORT

**Status:** STOP — no deterministic implementation exists. No files changed. Blocker requires a human/product decision.
**Date:** 2026-09-28
**HEAD:** `ede495b55efd95cedd882d90a19d12b4777da852` on `main` (= `origin/main`, no divergence)
**Scope:** tray locale/codegen blocker only. `memory.rs` / unsafe-code policy, Razorpay/MCP, CI workflows untouched.

---

## 1. Initial state (verified, not assumed)

- Worktree holds T03-E's uncommitted fix set plus pre-existing staged deletions of all 35 `docs/spec-v3/` files and untracked audit/report files. None of this state was reverted, reset, stashed, or overwritten.
- `git diff` on the two tray files vs HEAD:
  - `apps/desktop/src-tauri/build.rs`: HEAD was a 3-line stub (`tauri_build::build()` only). T03-E's uncommitted version adds the `generate_tray_translations()` generator implementing the contract documented in `tray_i18n.rs`, fail-closed.
  - `apps/desktop/src-tauri/src/tray_i18n.rs`: 2-line import cleanup only (fully-qualified paths in generated code; no logic change).
- `apps/desktop/src/i18n/locales/{en,fr,zh,zh-TW}/` exist on disk as **empty, untracked directories** (T03-E probe leftovers; invisible to git — `git status --porcelain -- apps/desktop/src/i18n/` is empty, `git ls-files apps/desktop/src/` lists no i18n files). Left as-is.

## 2. Evidence discovered

**The generated-source path is objectively correct (not broken):**
- `build.rs` resolves `<CARGO_MANIFEST_DIR>/../src/i18n/locales` = `apps/desktop/src/i18n/locales`, which is exactly where the (empty) frontend locale dirs sit. The compiler's own `rerun-if-changed` output confirms it enumerates that directory and the `en` entry before failing.
- Frontend convention matches: desktop web source lives at `apps/desktop/src/`. No path correction is available or needed.

**No authoritative source exists to point the generator at instead:**
- Frontend has **zero i18n infrastructure**: no i18n deps in `apps/desktop/package.json`, no i18n imports in `main.tsx`/`app.tsx`/`ipc.ts`, no tracked JSON locale files under `apps/desktop/` (only `components.json`, `package.json`, `tauri.conf.json`, `capabilities/default.json`, `catalog.json`, `tsconfig.json`).
- The `"tray"` data object exists **nowhere** in the repo — only in code comments and `build.rs` logic (repo-wide search for `"tray"` as data: 0 hits).
- No user-visible tray copy strings exist anywhere. The only related text is menu-item *names* (`"Copy Last Transcript"`, etc.) in archived `SORAVO_UI_INTEGRATION_PLAN.md` (docs/archive, superseded, English-only, partial) — not a locale source and insufficient to derive 4 locales × 8 keys without invention.
- `Soravo_Engineering_Docs_v6` specifies no tray locale copy (targeted search for `translation.json|locales|tray-locale`: no matches).

**The files are unrecoverable from repository history (exhaustive search):**
- `git rev-list --all -- '*translation.json'` → empty. `git rev-list --all -- '*locales*'` → empty. (Covers all local + remote refs.)
- `git log --all -- '*translation.json'` → empty.
- Introducing commits `a156c8c9` (PR #55) and `842acdf9` (HANDY-MIGRATION-001) added `tray.rs` (744 lines) + `tray_i18n.rs` (82 lines) with **no accompanying locale files** — the codegen inputs never existed.
- All 10 stashes (`stash@{0}`–`stash@{9}`) name-checked: no translation/locale/tray files.
- `.swarm-worktrees/` (3 dirs): doc-only, no desktop source, no i18n.
- Tracked `docs/spec-v3.zip` (56 files, docs-only): zero `*translat*`/`*locale*`/`*tray_i18n*`/`*i18n*` entries.
- Repo-wide glob `**/translation.json` → no files. Glob `**/i18n/**` → no tracked files.
- Handy upstream provenance remains UNKNOWN (consistent with T03-E §21 finding); per the task rules nothing was inferred from or fabricated about Handy.

**Fixed design surface (constrains, but does not supply, the missing copy):**
- 8 struct fields fixed by `tray.rs` usage: `settings`, `check_updates`, `copy_last_transcript`, `quit`, `cancel`, `model`, `unload_model`, `secure_input_warning`.
- 4 locales fixed by `tray_i18n.rs` tests: `en`, `zh-TW`, `zh`, `fr`.
- All 32 string VALUES are product copy with no evidence source → inventing them is fabrication, forbidden by rules 6 and 10.

## 3. Decision against the four fix categories

1. **Restore from history** — impossible: files never existed in any ref, stash, worktree, or archive. Proven above.
2. **Correct a broken generated-source path** — not applicable: the path is correct and verified end-to-end by the compiler output.
3. **Consume an already-existing authoritative source** — none exists (no i18n framework, no `"tray"` object, no copy strings, archive plan excerpt insufficient and superseded).
4. **Require a human/product decision** — **this is the correct disposition.**

## 4. Exact files changed

**None.** Zero modifications (source, config, CI, docs, memory/unsafe policy all untouched). The STOP rule applies: the files cannot be recovered without inventing product content.

## 5. Why STOP (rather than a fix) is authoritative

Every recoverable-source hypothesis was falsified by direct evidence, the generator path was verified correct rather than assumed broken, and no alternative in-repo source survived scrutiny. The only remaining input — 32 translated product strings — is a product/copy decision (or an English-only scope reduction plus test adjustment, or a Handy source manifest if copy is to come from upstream). T03-E's fail-closed generator is the correct terminal engineering state: it compiles the documented contract and stops with an actionable message instead of emitting guessed copy.

## 6. Verification results

| Check | Result |
|---|---|
| `cargo check -p soravo-desktop --all-targets` (desktop compiler) | **Reproduces B1 exactly**: build-script panic `tray i18n: missing translation file for locale 'en' at …/apps/desktop/src/i18n/locales/en/translation.json` (exit 101). No source errors reachable past the gate. |
| Filesystem + git evidence sweep (§2) | Locales inputs absent everywhere recoverable; path correct; no alternative source. |
| Narrower-than-compiler checks | Filesystem/git/zip/stash/worktree searches above are deterministic and repeatable without compilation. |

No broader test/clippy/fmt runs were warranted: nothing was modified, and the build gate blocks all downstream desktop verification identically to T03-E.

## 7. Remaining blockers (unchanged from T03-E)

1. **B1 (this task): tray locale inputs** — 4× `translation.json` (or a scoped-down alternative) still missing. Human/product decision required.
2. **B2 (out of scope): `memory.rs:32,49` unsafe vs workspace `unsafe_code = "forbid"`** — ADR/policy decision required. Untouched per rules.

## 8. Human approval still required — YES

Specifically needed from a human/product owner (any one of):
- (a) Author the four locale files (`en`, `zh-TW`, `zh`, `fr`, each with a `tray` object covering the 8 keys in §2); or
- (b) Decide English-only (or another reduced set) **plus** adjust `tray_i18n.rs` fallback tests that require all four locales; or
- (c) Supply a Handy source manifest per the chain-of-custody doc if the copy is to be derived from upstream.

Until then the desktop build remains red at the build-script gate by design, and no further codegen-side work can advance it without fabrication.

---

*No commit made, nothing pushed. Worktree state preserved as found (T03-E fix set + pre-existing doc deletions intact).*
