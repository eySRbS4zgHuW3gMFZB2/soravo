# ADR-028 — Handy Chinese-script selector #2186: adoption decision (PROPOSED)

Status: PROPOSED — awaiting explicit human owner approval. NOT accepted.
Date: 2026-10-03 (UTC)
Task: T34-F — HANDY CURRENT-MAIN DELTA RECONCILIATION / REMAINING UPSTREAM ITEMS
Sequence: v6 pack sequence. The index of record is
`docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, which governs. Root
`10_ADR_INDEX.md` and `decisions/` files belong to a different, older
sequence and are unaffected by this entry.
Branch: `t31/soravo-wrapper-completion`
HEAD (task ref): `312c813fcd50e8288eb57a98df27d68f02e9638f`
`origin/main`: `ede495b55efd95cedd882d90a19d12b4777da852`
PR #63: OPEN, `MERGEABLE`/`BLOCKED`, `REVIEW_REQUIRED` — NOT MERGED.

Context:

- T34-F re-diffed the Soravo frozen Handy pin
  (`ba10ce1943ef34e93c09494027fc0b9ced2e8a44`) against current Handy `main`
  (`8605699d988ef87e7717cee28fff25c0546bb564`) and found **23 commits**
  (19 known from T34 + 4 new). One new commit changes transcription /
  transcript-adjacent behavior:
  `0bb0428ea6e9a40aea3c05a754134105a1821d3f`
  ("add chinese script selector + simplify internals (#2186)").
- Governance in force: Handy is an implementation source, not a product
  authority (`04_HANDY_FORK_AND_REUSE_POLICY.md`); transcript semantics are
  SORAVO-OWNED (same file; ADR-008 one-liner); the V1 HANDY-CORE
  PRESERVATION POLICY freezes transcription-pipeline / normalization /
  STT-output behavior (same file; ADR-018); there is no automatic upstream
  synchronization (`21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`). The #2186 change
  therefore MUST NOT be silently adopted. This ADR is the owner-decision
  record T34-F was queued to produce for it.
- No existing Soravo ADR governs Chinese-script conversion, `zh-Hans` /
  `zh-Hant` intent handling, or OpenCC output conversion beyond the V1
  freeze above.

Handy source commit (source-first, re-derived this session from a fresh
Handy clone at `/tmp/opencode/handy-fresh` — not inferred from the title):

- #2186 — `0bb0428ea6e9a40aea3c05a754134105a1821d3f`
  (Author: CJ Pais, 2026-10-03T08:22:38+08:00).
  Parent: `5ec58f696354fcf64ae831102e673779e0249717` (the PR-template
  update that was Handy `main` at T34 time).
  Files changed (Rust + frontend + i18n): `src-tauri/src/actions.rs`
  (−82: deletes `maybe_convert_chinese_variant`,
  `resolve_effective_language`, and their call site),
  `src-tauri/src/chinese_script.rs` (new, 131 lines: `ChineseVariety`,
  `chinese_script_for_locale`, cached OpenCC converters, live-preview
  `PreviewScript`), `src-tauri/src/lib.rs` (+1 module, +1 command
  registration), `src-tauri/src/managers/model.rs` (removes the
  `zh-Hans`/`zh-Hant` pass-through exception in `effective_language` +
  deletes 2 tests), `src-tauri/src/managers/transcription.rs` (+177/−~60:
  `PreviewScript` streaming conversion, final-text script conversion
  before custom words, removal of `normalize_cjk_language`),
  `src-tauri/src/settings.rs` (new `ChineseScript` enum, new
  `chinese_script` field with locale-derived default + one-time
  migration splitting legacy `zh-Hans`/`zh-Hant` intents, new migration
  test, snapshot update), `src-tauri/src/shortcut/mod.rs` (new
  `change_chinese_script_setting` command), `src-tauri/src/tray_i18n.rs`
  (locale→script mapping delegated to the shared helper),
  `src-tauri/src/audio_toolkit/text.rs` (1 line: `OutputLanguageEvidence::language`
  `fn` → `pub(crate) fn`), `src-tauri/src/audio_toolkit/lang_id.rs`
  (doc comment only), plus `bindings.ts`, `ChineseScript.tsx`,
  `LanguageSelector.tsx`, `ModelSettingsCard.tsx`, `AdvancedSettings.tsx`,
  `settingsStore.ts`, `languages.ts`, and per-locale `translation.json`
  additions. No dependency change (`ferrous-opencc` already declared).

Soravo current behavior (read from source this session):

- `apps/desktop/src-tauri/src/actions.rs:17` declares `ferrous_opencc`
  and `:344-417` implements `maybe_convert_chinese_variant` +
  `resolve_effective_language` + the `process_transcription_output`
  call site — i.e. Soravo retains the Handy PRE-#2186 arrangement
  (effective-language-gated OpenCC conversion in post-processing).
- `managers/model.rs:272-299` retains the `zh-Hans`/`zh-Hant`
  pass-through exception plus its tests (`:2693`, `:2735`); `managers/transcription.rs`
  retains `normalize_cjk_language` (`:1654`) with 3 call sites
  (`:1378`, `:1422`, `:1751`); no `chinese_script.rs`, no
  `ChineseScript` setting, no `change_chinese_script_setting` command,
  no `PreviewScript`; `text.rs:language()` is private.
- Soravo `Cargo.toml:27` already declares `ferrous-opencc = "0.4"`,
  so the conversion machinery's dependency exists on both sides; the
  difference is placement, gating, and user control — not dependency
  presence (`supply-chain-risk-auditor` evaluated and declined with
  this reason recorded: #2186 adds/removes no dependency).

Semantic difference:

- Before (#2186): the OpenCC conversion key is the *effective language*
  derived from the loaded model's capabilities (`zh-Hans`/`zh-Hant`
  intents pass through `effective_language` unchanged); conversion runs
  once, in `process_transcription_output`, on final text only.
- After (#2186): recognition language and output script are separate
  user choices (`ChineseScript`: `AsTranscribed` default for upgrades
  via migration, locale-derived default for fresh installs);
  conversion runs on final text (before custom words, keyed off
  detected output variety so non-Chinese text such as Japanese kanji
  is never rewritten) AND on live-preview streaming text
  (`PreviewScript`, cosmetic only); `effective_language` no longer
  passes script intents through; `normalize_cjk_language` is gone.
- Both change user-visible transcript bytes for Chinese output and
  alter the settings schema (new field + migration) and the IPC
  surface (new command). Text post-processing placement changes;
  engine behavior, segmentation, language detection mechanics, and
  tentative/final contract structure are unchanged.

Constraints:

- V1 freeze (v6 §04 + ADR-018): adopting #2186 alters frozen
  transcription-pipeline / normalization / STT-output behavior and
  therefore requires this explicit owner decision; silent adoption is
  forbidden.
- Soravo-owned transcript semantics (ADR-008, `05_DESKTOP_CONTRACTS.md`):
  final/committed text bytes for Chinese output change, and a new
  user-facing script control appears. Settings-schema migration touches
  persisted user state. New IPC command extends the typed surface.
- #2186's `text.rs` hunk parent is Handy's POST-#2157 blob
  (`40686f0`); Soravo's `text.rs` is pin-exact PRE-#2156/#2157
  (`7d341440…410941`, still containing `"ha"`). The visibility change
  cannot be applied without first resolving ADR-027's items — a
  further reason this needs an owner-sequenced decision, not a silent
  port.
- Security review (this session, `security-guidance` + `rust-review`
  lenses, read-only — no code changed by this ADR): no new `unsafe`;
  no new dependency; OpenCC converter construction moves behind
  `OnceLock` caching (no per-keystroke dictionary parse); conversion
  is keyed off detected Chinese variety only; settings migration is a
  one-time `chinese_script`-absent gate; no secret/IPC-shape change
  beyond the additive command. Full implementation-time review is
  deferred to the post-approval implementation task.
- Test impact (not executed): #2186 deletes 2 `effective_language`
  tests, adds a migration test, and updates a settings snapshot —
  Handy-test edits that require the same authorization as the code
  (v6 §04 rule 7 of recovery).

Decision (PROPOSED — takes effect ONLY on explicit human owner approval):

- D-2186: ADOPT Handy #2186 — relocate Chinese-variant conversion from
  `actions.rs` post-processing into the transcription pipeline behind
  an explicit `ChineseScript` setting, with the locale-derived fresh-install
  default, the one-time legacy-intent migration, the `effective_language`
  pass-through removal, the `normalize_cjk_language` removal, the
  `language()` visibility widening, the new `change_chinese_script_setting`
  command, and the named test/snapshot updates, each ported verbatim
  (modulo the Soravo path prefix and the ADR-027 sequencing dependency
  above). Rationale on record: it separates recognition language from
  output script (fixing the stale-intent kanji-rewrite class), makes
  conversion user-controllable with a safe upgrade default
  (`AsTranscribed` for existing stores), and adds live-preview
  conversion the old placement could not provide.
- Until the human approves, Soravo REMAINS INTENTIONALLY DIFFERENT
  (pre-#2186 OpenCC-in-`actions.rs` arrangement); no production, test,
  config, or frontend file is modified by this ADR task.

Consequences:

- On approval + implementation: Chinese output conversion becomes a
  user setting instead of a model-capability side effect; legacy
  `zh-Hans`/`zh-Hant` intents migrate once to `zh` + script;
  `effective_language` resolves bare intents to concrete model codes;
  live preview converts cosmetically; final injected bytes for
  Chinese change accordingly for users who select a script.
- If the owner rejects, Soravo stays pre-#2186 for this item and this
  ADR is amended to record INTENTIONALLY DIFFERENT with the owner's
  reason; the `chinese_script` setting, migration, and command MUST
  NOT be copied.

Testing requirements (on approval; not executed by this task):

- Focused tests: Handy's `chinese_script_migration_only_carries_over_legacy_intents`
  plus new conversion tests (Simplified↔Traditional for Mandarin and
  Cantonese varieties; non-Chinese text such as Japanese kanji never
  rewritten; `AsTranscribed` byte-identity). Never weaken or delete
  tests beyond the two authorized `effective_language` test removals.
- Run: `cargo test -p soravo-desktop --lib managers::model`,
  `cargo test -p soravo-desktop --lib managers::transcription`,
  `cargo test -p soravo-desktop --lib shortcut::`,
  settings snapshot test, full desktop Rust tests,
  `cargo fmt --check`,
  `cargo clippy -p soravo-desktop --lib --tests`, `git diff --check`,
  frontend typecheck/test for the settings UI surface.
- Revisit conditions: any new Handy change to `chinese_script.rs`,
  OpenCC usage, or CJK handling; any Soravo transcript-contract change
  (ADR-008); approval/sequencing of ADR-027 (the `text.rs` parent
  dependency).

Owner/approval requirement:

- This ADR is PROPOSED. It must NOT be treated as accepted because the
  analysis finds adoption reasonable. A human owner must explicitly
  approve D-2186. Implementation is authorized ONLY after that
  approval, strictly scoped to the approved item plus its named tests.
  T34-F performs NO #2186 implementation.

Implementation plan (prepared, NOT executed — runs only after approval):

1. Add `chinese_script.rs` (verbatim port) + `mod chinese_script`
   in `lib.rs`.
2. Add `ChineseScript` enum + `chinese_script` field + default +
   migration + migration test + snapshot update in `settings.rs`.
3. Remove `maybe_convert_chinese_variant` /
   `resolve_effective_language` + call site from `actions.rs`
   (keeping the T34-C model-availability guard intact).
4. Remove the `zh-Hans`/`zh-Hant` pass-through + 2 tests from
   `model.rs`; remove `normalize_cjk_language` + rewire 3 call sites
   in `transcription.rs`; add `PreviewScript` streaming conversion +
   final-text conversion in `post_process_transcription_text`.
5. Widen `OutputLanguageEvidence::language()` to `pub(crate)`
   (sequenced after ADR-027 if approved; otherwise re-based on the
   retained file with owner direction).
6. Add `change_chinese_script_setting` command + registration;
   delegate `tray_i18n.rs` mapping to the shared helper.
7. Add the `ChineseScript.tsx` selector surface (or the Soravo-owned
   settings-surface equivalent — owner to confirm UI placement since
   UI overhaul is deferred).
8. Run the full test/evidence list under Testing requirements.
9. Commit production + test + PROGRESS changes with explicit-path
   staging; never `git add -A`; never edit `main`; never force-push.

Skills selected/loaded (Skill Selection Gate, BEFORE analysis):

- `rust-engineer` — loaded (full body): ownership/error/clippy
  discipline for reading the `transcription.rs` / `model.rs` /
  `settings.rs` / `actions.rs` diffs and caller code.
- `rust-review` — loaded (skill body): `unsafe`/panic/boundary lens
  on the new module and the `OnceLock` converter cache.
- `tauri` — loaded (full body): v2 command/state semantics for the
  new `change_chinese_script_setting` IPC surface assessment.
- `gh-cli` — loaded (full body): authenticated-`gh`-over-curl rule
  for PR #63 + CI reads.
- `github` — loaded (full body): `gh pr checks / gh run` workflows.
- `security-guidance` — loaded (skill body): ASVS lens on
  text-processing boundaries, settings-migration trust, IPC exposure.
- `supply-chain-risk-auditor` — loaded (full body): evaluated and
  DECLINED with reason (zero dependency delta in #2186 —
  `ferrous-opencc` already declared on both sides).
- No STT/transcription specialist skill exists in the installed set
  (32 entries inventoried) — recorded gap; forensics done by direct
  source inspection. `semgrep`/`codeql` evaluated and declined (no
  new sink implemented; read-only analysis).
