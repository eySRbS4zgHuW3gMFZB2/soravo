# ADR-027 — Handy transcription fixes #2156 / #2157: adoption decision (PROPOSED)

Status: PROPOSED — awaiting explicit human owner approval. NOT accepted.
Date: 2026-10-03 (UTC)
Task: T34-D — OWNER/ADR REVIEW OF HANDY TRANSCRIPTION SEMANTICS (#2157 / #2156)
Sequence: v6 pack sequence. The index of record is
`docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, which governs. Root
`10_ADR_INDEX.md` and `decisions/` files belong to a different, older
sequence and are unaffected by this entry.
Branch: `t31/soravo-wrapper-completion`
HEAD (task ref): `85a3b102c36f4c4aa76b9220b032261468d4602a`
`origin/main`: `ede495b55efd95cedd882d90a19d12b4777da852`
PR #63: OPEN, `MERGEABLE`, `mergeStateStatus: BLOCKED`,
`reviewDecision: REVIEW_REQUIRED` — NOT MERGED.

Context:

- T34 (forensic, no implementation) diffed the Soravo frozen Handy pin
  against current Handy `main` and found 19 commits. Two change
  transcription/text-processing semantics in
  `src-tauri/src/audio_toolkit/text.rs`:
  `8ef8dd43` (#2156, "stop removing Ha as an English filler word") and
  `eb49dc02` (#2157, "keep the sentence capital after removing a leading
  filler").
- Soravo `apps/desktop/src-tauri/src/audio_toolkit/text.rs` is
  byte-identical to the pin (blob `82d45b5aced133ae5424365a707017cbf69cff98`,
  29,496 B) and `lang_id.rs` is likewise pin-identical (blob
  `82834bdb7eb2196664fa999774c4678cb2c8534b`, 6,685 B). Soravo therefore
  exhibits the OLD (pre-#2156/pre-#2157) behavior.
- Governance in force: Handy is an implementation source, not a product
  authority (`04_HANDY_FORK_AND_REUSE_POLICY.md`); transcript semantics are
  SORAVO-OWNED (same file; ADR-008 one-liner); the V1 HANDY-CORE
  PRESERVATION POLICY freezes filler-word / normalization / punctuation /
  STT-output behavior (same file; ADR-018); there is no automatic upstream
  synchronization (`21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`). The two Handy
  changes therefore MUST NOT be silently adopted. This ADR is the
  owner-decision record T34-D was queued to produce.
- No ADR-007/ADR-008 standalone text exists (index one-liners only); no
  existing Soravo ADR governs filler lists or capitalization rules beyond
  the V1 freeze above.

Handy source commits (source-first, re-derived this session from a fresh
Handy clone — not inferred from titles):

1. #2156 — `8ef8dd4347c08ba20936dda1024172fe2e4cb90a`
   (Author: Aktan Azat, 2026-09-27T21:10:25-07:00).
   Parent: `8f9cf53cd1410cda26beea39ff802ac306e39585`.
   Files changed: exactly one —
   `src-tauri/src/audio_toolkit/text.rs` (1 insertion, 1 deletion).
   Complete diff: `"en" => &["um", "ah", "eh", "ha"]` becomes
   `"en" => &["um", "ah", "eh"]`. Commit body: the case-insensitive filler
   pattern turned "Ha Long Bay is beautiful." into "Long Bay is beautiful."
   and "Ha Noi" into "Noi"; remaining English fillers still cover
   hesitation sounds. No test added or changed by this commit.
2. #2157 — `eb49dc02acfe94fe3b03e3b83316c1f1bbee920b`
   (Author: Aktan Azat, 2026-09-27T21:49:58-07:00).
   Parent: `2d526b157953ddf9a5bb34194786cea69569b6a1` (the
   transcribe-cpp 0.2.3 → 0.2.4 bump; mainline order is #2156 → bump →
   #2157). Files changed: exactly one —
   `src-tauri/src/audio_toolkit/text.rs` (59 insertions, 3 deletions).
   Complete diff: three new private functions — `opens_sentence`
   (sentence-open = empty/whitespace-only kept text, or kept text ending
   in `.` `!` `?` `…`), `push_restoring_capital` (while a capital debt is
   owed, uppercases the first alphanumeric char of the next kept segment),
   `remove_filler_matches` (replaces the per-pattern plain
   `pattern.replace_all` loop; a removed filler that was capitalized AND
   sentence-opening hands its capital to the replacement word) — plus the
   one-line loop change to call it, two updated test expectations
   (`"this is a test"` → `"This is a test"`,
   `"so I was, thinking about this"` → `"So I was, thinking about this"`),
   and one new test
   `test_filter_leading_filler_keeps_sentence_capital` ("Um, so I think we
   should ship it." → "So I think we should ship it."; "That works. Um,
   let me check." → "That works. Let me check."; mid-sentence "He said,
   Um, not today." → "He said, not today." — no capital handed over).
   Commit body (verified against the code): lowercase fillers and
   mid-sentence fillers leave the next word unchanged.

Soravo current behavior (read from source this session):

- Filler removal defaults ON (`settings.rs:584`
  `default_filler_word_removal_enabled() -> bool { true }`, custom list
  `None` → built-in tiers).
- English gated list still contains `"ha"` (`text.rs:316`).
- Removal loop is the plain `pattern.replace_all(&filtered, "")`
  (`text.rs:411-415`); no `remove_filler_matches` / `opens_sentence` /
  `push_restoring_capital` symbols exist anywhere in Soravo.
- Filler removal runs inside `post_process_transcription_text`
  (`managers/transcription.rs:1768-1817`) on the FINALIZED text path
  (`remove_filler_words` at `:1808`, `normalize_transcription_output` at
  `:1815`), wrapped in `fail_open_text_transform` (panic → raw text
  preserved). Tentative/streaming text is emitted unprocessed
  (`emit_stream_text` from `stream.text()`). So both Handy changes affect
  final/committed user-visible text only — never tentative text, never
  segmentation, never language detection, never the STT engine.
- Soravo tests assert the OLD behavior: `test_filter_filler_words_case_insensitive`
  (`text.rs:505-510`) expects `"this is a test"`;
  `test_filter_combined` (`text.rs:533-538`) expects
  `"so I was, thinking about this"`. No Soravo test asserts English `"ha"`
  removal (the only `"ha"` tests use `"es"` or `Unknown` evidence and are
  unaffected by #2156).

Semantic difference:

- #2156: exactly one token removed from the English gated filler list.
  Before: standalone "ha"/"Ha" deleted whenever output-language evidence
  is English. After: retained. English-specific (gated tier requires `en`
  evidence: UserSelected / ModelConstrained / ModelDetected / TextDetected
  "en", or TranslatedToEnglish). Spanish "ha" was already preserved and is
  unaffected. Text post-processing only; no broader STT consequence.
- #2157: removal mechanism change (plain replace → capital-restoring
  match walk). Mechanism is language-INDEPENDENT (it applies to the
  universal tier, every gated language list, and custom override lists);
  the observable change fires only when a removed filler was capitalized
  AND sentence-opening. Before: "Um, so I think" → "so I think" (model's
  sentence casing destroyed). After: → "So I think". Lowercase/mid-sentence
  behavior identical. Capitalization-only consequence; punctuation,
  segmentation, language detection, tentative text, engine behavior all
  unchanged. Text post-processing only; no broader STT consequence.

Constraints:

- V1 freeze (v6 §04 + ADR-018): adopting either change alters frozen
  filler-word/normalization/STT-output behavior and therefore requires
  this explicit owner decision; silent adoption is forbidden.
- #2157 adoption additionally rewrites two preserved test expectations
  (integrity witnesses — T34 §2.2, v6 §04 rule 7 of recovery: do not
  rewrite Handy tests without authorization); #2156 touches zero existing
  tests.
- Session/transcript contracts (ADR-007/ADR-008, `05_DESKTOP_CONTRACTS.md`:
  tentative = UI only, committed/final = injectable, no stale/duplicate
  text) are structurally untouched by both changes; only final-text bytes
  change. IPC shape, account/auth/payment, model catalog, dependencies all
  untouched (both Handy commits touch only `text.rs`; no `Cargo.toml` /
  `Cargo.lock` delta — `supply-chain-risk-auditor` evaluated and declined
  with this reason recorded).
- Security review (this session, `security-guidance` + `rust-review`
  lenses): no new regex (existing patterns reused → no ReDoS change,
  linear `find_iter`); all new slicing is `char_indices`/regex-boundary
  based (no byte-split panic); no `unwrap`/`expect`/indexing added;
  Unicode uppercasing via `to_uppercase` (correct incl. expansion);
  `opens_sentence` terminators cover `.` `!` `?` `…` but not CJK `。！？`
  (behavior note, not a defect — capital restoration simply does not fire
  there); no transcript/audio/secret logging added; no IPC surface change;
  no `unsafe`; `fail_open_text_transform` (`catch_unwind`) already bounds
  any post-processing panic to raw-text fallback. No new dependencies.

Decision (PROPOSED — takes effect ONLY on explicit human owner approval):

- D-2156: ADOPT Handy #2156 — remove `"ha"` from the English gated filler
  list (`text.rs:316` → `&["um", "ah", "eh"]`). Rationale on record: it is
  a strict false-deletion fix (real-word proper nouns "Ha Long"/"Ha Noi"
  destroyed under English evidence); it narrows deletion, adds no new
  mechanism, and changes zero existing test expectations.
- D-2157: ADOPT Handy #2157 — port `opens_sentence` /
  `push_restoring_capital` / `remove_filler_matches` verbatim (modulo
  Soravo path prefix only), switch the removal loop to
  `remove_filler_matches`, update the two expectations to Handy's
  post-#2157 values, and add Handy's
  `test_filter_leading_filler_keeps_sentence_capital` regression test.
  Rationale on record: plain replacement destroys sentence casing the
  model produced ("Um, so I think" → "so I think"); the fix restores
  exactly the removed capital and provably leaves lowercase/mid-sentence
  cases byte-identical.
- Until the human approves, Soravo REMAINS INTENTIONALLY DIFFERENT
  (pin-exact OLD behavior); no production or test file is modified by this
  ADR task.

Consequences:

- On approval + implementation: English transcripts retain standalone
  "Ha"; sentence-initial capitals survive leading-filler removal in all
  languages/custom lists; the two named tests change expectations (plus
  one new test); final/committed injected text bytes change accordingly
  while tentative/streaming behavior is unchanged.
- If the owner rejects either item, Soravo stays pin-exact for that item
  and this ADR is amended to record INTENTIONALLY DIFFERENT with the
  owner's reason; the corresponding Handy test expectation MUST NOT be
  copied.

Testing requirements (on approval; not executed by this task):

- Focused regression tests: Handy's
  `test_filter_leading_filler_keeps_sentence_capital` (for #2157) plus a
  new English-`"ha"` retention test (for #2156, e.g. "Ha Long Bay is
  beautiful." and "Ha Noi" preserved under `"en"` evidence; hesitation
  fillers still removed). Never weaken or delete tests beyond the two
  authorized expectation updates.
- Run: `cargo test -p soravo-desktop --lib audio_toolkit::text`,
  `cargo test -p soravo-desktop --lib managers::transcription`, full
  desktop Rust tests, `cargo fmt --check`,
  `cargo clippy -p soravo-desktop --lib --tests`, `git diff --check`.
- Existing relevant tests inspected (not modified): `text.rs:505-510`,
  `:533-538` (would change under #2157); `:597-603`, `:644-667`
  (unaffected by #2156); `transcription.rs` F-11…F-15 set (unaffected by
  both — none involve a removed capitalized sentence-opening filler or
  English "ha").
- Missing coverage noted: no English-`"ha"` retention test exists today.

Revisit conditions:

- Any new Handy change to `text.rs`/`lang_id.rs` filler or casing
  semantics; any Soravo transcript-contract change (ADR-008); any change
  to filler-removal defaults or the tentative/final processing boundary;
  any evidence that a gated token deletes real words in another language.

Owner/approval requirement:

- This ADR is PROPOSED. It must NOT be treated as accepted because the
  analysis finds adoption reasonable. A human owner must explicitly
  approve D-2156 and D-2157 (independently — either may be approved while
  the other is held as INTENTIONALLY DIFFERENT). Implementation is
  authorized ONLY after that approval, strictly scoped to the approved
  item(s) plus their named tests. T34-D performs NO implementation.

Implementation plan (prepared, NOT executed — runs only after approval):

1. `text.rs:316`: drop `"ha"` from the en list (D-2156).
2. Port the #2157 hunk: insert `opens_sentence` /
   `push_restoring_capital` / `remove_filler_matches` before
   `remove_filler_words`; change the loop to `remove_filler_matches`
   (D-2157). Byte-compare the ported functions against Handy
   `eb49dc02:src-tauri/src/audio_toolkit/text.rs`.
3. Update the two expectations; add the two regression tests above.
4. Run the full test/evidence list under Testing requirements.
5. Commit production + test + PROGRESS changes with explicit-path staging;
   never `git add -A`; never edit `main`; never force-push.

Skills selected/loaded (Skill Selection Gate, BEFORE analysis):

- `rust-engineer` — loaded (full body): ownership/error/clippy discipline
  for reading the `text.rs` diffs and caller code.
- `rust-review` — loaded (summary S354): `unsafe`/panic/UTF-8-boundary
  lens on the new match-walk code.
- `gh-cli` — loaded (full body): authenticated-`gh`-over-curl rule for
  PR #63 + CI reads.
- `github` — loaded (full body): `gh pr checks / gh run` workflows.
- `security-guidance` — loaded (summary S355): ASVS lens on
  text-processing boundaries, regex, Unicode, logging, IPC exposure.
- Testing skill evaluated: `vitest` NOT loaded — the affected tests are
  Rust `#[cfg(test)]` unit tests run by cargo; no TypeScript test surface
  is touched. No STT/audio/transcription specialist skill exists in the
  installed set (confirmed via `07_AI_SKILLS.md` matrix: Audio — none
  installed; STT/ML — none installed; plus `~/.agents/skills/` inventory)
  — recorded explicitly, forensics done by direct source inspection.
- `supply-chain-risk-auditor` evaluated and DECLINED with reason: both
  Handy commits touch only `text.rs` (no manifest/lockfile/dependency
  delta), so no supply-chain implication arises.
