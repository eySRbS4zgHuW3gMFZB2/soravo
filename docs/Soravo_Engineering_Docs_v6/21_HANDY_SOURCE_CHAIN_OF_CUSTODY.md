# 21 — Handy Source Identity and Chain of Custody

## Purpose

This file prevents the desktop foundation from becoming an unattributed or
unreproducible mixture of Handy code and Soravo code.

Handy is an implementation source, not a product or security authority.
Soravo owns the resulting product contracts.

## Current evidence state

### Pack research snapshot — NOT a Handy identity

Pack research HEAD: `2f96f3d21213bce24f049996d5ab897f16acd31b`

**This is a Soravo commit, not a Handy source SHA.** It is the Soravo snapshot
the pack was generated from (`git log -1` → `2026-09-27 fix: update
pnpm-lock.yaml to match payment-domain package.json`), and it is an ancestor of
`main`. It exists in no Handy repository. It MUST NOT ever be cited as Handy
provenance. Historical revisions of this file placed it under a heading that
read as provenance; that placement was wrong and is corrected here.

### Upstream Handy source identity — VERIFIED

| Field | Value |
|---|---|
| Upstream repository | `https://github.com/cjpais/Handy` |
| Exact recovery/reference pin | `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` |
| Short SHA | `ba10ce19` |
| Commit date (committer, UTC) | `2026-09-15T05:29:06Z` |
| Upstream `main` at time of this correction | `29bd2c0d6b4b705df5fd6d2f387e5db5ecc27480` (`2026-09-28T07:02:36Z`) |
| Upstream software licence | `MIT` (repository licence field and a `LICENSE` file present at the pin) |

**Proof method: blob identity, not inference.** The blob of
`apps/desktop/src-tauri/src/managers/transcription.rs` as committed in
`a156c8c916b00f1da27010a88e08bcaef5b1d91f` is
`bed8d92c638d84378ed3c4cd8c1335ce0888fae7`. The blob of
`src-tauri/src/managers/transcription.rs` at `ba10ce19` is the same value. The
imported file is therefore **byte-identical to upstream Handy** — the pin is
upstream, and the exact source content is fixed.

**What blob identity does and does not prove — stated precisely.** That blob is
unchanged upstream from `e4ae0d44b4de21b981e0c8e478d0c93a2ffd3420` (2026-09-10)
through `ba10ce19` and on to current `main`. Blob identity therefore proves
**upstream origin and exact byte content**; it does **not** uniquely select one
upstream commit.

`ba10ce19` is the **pin of record** because it is (a) the commit this
repository's own STT-003 / TYPE-002-003 Handy reuse audits already declared, and
(b) a dated, immutable reference point on the upstream mainline (verified: it
is an ancestor of upstream `main`). It is the reference against which every
restore in this repository is measured.

**Corollary — a previously repeated claim that is NOT proven.** It has been
asserted that the reuse-matrix pin `8f9cf53c…` "is not the source of the
imported blobs". `8f9cf53c` **carries the same blob**, so blob identity
**cannot exclude it**. That claim is withdrawn as unproven. `8f9cf53c` is
recorded here as a *differently declared* pin, not as a disproven one. This
does not affect the pin of record or any restore target.

### Other known repository evidence

- PR #55 (`docs: adopt Handy-derived desktop architecture v3`) is CLOSED and
  was NOT merged.
- Commit `a156c8c916b00f1da27010a88e08bcaef5b1d91f` later integrated 40+ Handy-
  derived source files into `main`.
- That commit explicitly recorded that the integration required additional
  dependencies and a later full build/test pass.
- The previously documented Handy pin `842acdf9` is a **Soravo** commit and is
  not an ancestor of current `main`. It MUST NOT be treated as a Handy source
  identity.
- A reuse-matrix pin `8f9cf53c…` is separately declared in
  `docs/COMPLIANCE/HANDY-MIGRATION-001_REUSE_MATRIX.md`. It exists upstream and
  carries the same `transcription.rs` blob as the pin of record, so it is
  neither confirmed nor excluded by blob identity. See the corollary above.
- `ba10ce19` is the pin of record, and is the only pin this repository's own
  audits declared correctly from the outset (in the STT-003 / TYPE-002-003
  Handy reuse audits).

### Recovered-source boundary

The boundary below is the honest state. Anything outside it is `UNKNOWN` and is
not inferred.

**PROVEN by blob comparison at `ba10ce19` (upstream origin + exact bytes):**

- `apps/desktop/src-tauri/src/managers/transcription.rs` — imported
  byte-identical at `a156c8c9`. This is the identity proof that establishes
  upstream origin for the Handy-derived transcription pipeline.
- `apps/desktop/src-tauri/src/catalog/mod.rs` — adopted byte-identical at
  `a156c8c9`.
- `apps/desktop/src-tauri/src/paste_tx/{mod,macos,windows}.rs` — not present at
  the import commit; restored later from `5f56260c` and verified SHA-256
  identical. All three are present upstream at the pin.
- Full-surface comparison, re-derived first-hand: of the **61** `.rs` files
  under `src-tauri/src` at the pin, **34 are byte-identical** to the same paths
  at `a156c8c9`, **7 differ** (entry points / settings / module index —
  `actions.rs`, `audio_toolkit/mod.rs`, `audio_toolkit/vad/mod.rs`, `lib.rs`,
  `main.rs`, `settings.rs`, `shortcut/mod.rs` — the legitimate adaptation
  surface), and **20 were never imported**.

> **Measurement frame, stated so the number is checkable.** The 34/7/20 figures
> above are measured over *all* upstream `.rs` files under `src-tauri/src` at
> the pin, compared against the *same paths* as committed at `a156c8c9`. The
> earlier audit recorded `26 of 32 imported files byte-identical / 6 differ / 0
> absent`, which is a narrower frame (restricted to the files that commit
> added). **Both are correct within their own frame; they are not the same
> count.** What is frame-independent, and is the load-bearing fact, is the
> single blob identity above.

**Re-verification method note.** Blob identity must be resolved with
`git ls-tree`. `git rev-parse <rev>:<path>` does **not** fail on an
unresolvable path — it echoes the argument back and exits `0`, which silently
converts every absent file into an apparent "differing" file. Any provenance
re-check using `rev-parse` alone will overstate divergence.

**PRESENT AT THE PIN** — every path below was verified to exist upstream at
`ba10ce19` (API path + byte size, and blob SHA where quoted):

| Upstream path at `ba10ce19` | Size | Upstream blob | Status in this repository |
|---|---|---|---|
| `src-tauri/src/audio_toolkit/text.rs` | 29,496 B (828 lines) | `82d45b5aced133ae5424365a707017cbf69cff98` | **never imported — 0 of 84 refs** |
| `src-tauri/src/audio_toolkit/lang_id.rs` | 6,685 B (170 lines) | `82834bdb7eb2196664fa999774c4678cb2c8534b` | **never imported — 0 of 84 refs** |
| `src-tauri/src/audio_toolkit/utils.rs` | 10 lines | — | never imported |
| `src-tauri/src/audio_toolkit/constants.rs` | 1 line | — | never imported |
| `src-tauri/src/catalog/catalog.json` | 127,334 B (2,238 lines) | `64fc3482a8c7ff8b0a053a043e789b22113045ec` | **never imported** — local copy is 3 bytes `{}` |
| `src-tauri/resources/models/silero_vad_v4.onnx` | 1,807,522 B | — | **asset** — absent locally, and never in any ref |
| `src-tauri/src/managers/transcription.rs` | 100,389 B | `bed8d92c638d84378ed3c4cd8c1335ce0888fae7` | imported byte-identical at `a156c8c9` |
| `src-tauri/src/paste_tx/{mod,macos,windows}.rs` | 11,071 / 13,036 / 22,234 B | — | restored byte-identically from `5f56260c` |
| `scripts/gen_catalog.py` | 301 lines | — | never imported |

The `text.rs` / `lang_id.rs` absence is frame-independent: a scan of all **84**
refs in this repository finds **0** containing either path.

**SUBSTITUTED — a Soravo-authored replacement exists with no upstream
counterpart at any ref:** `apps/desktop/src-tauri/src/audio_toolkit/post_process.rs`
(280 lines). Sole add commit `fc56c31b` (2026-09-28). Upstream
`src-tauri/src/audio_toolkit/post_process.rs` returns **404 — it does not exist**.

**STILL UNKNOWN / NOT ESTABLISHED (must remain `UNKNOWN`, never inferred):**

- the exact `LICENSE` file text and hash for the imported snapshot;
- per-file SHA-256 for the whole imported surface (field 7 below);
- the exact Soravo commit that imported/adapted **every** file (field 5 below);
- post-import modifications, per file (field 8 below);
- files deliberately not reused, with reasons (field 9 below);
- all model/weight provenance (field 10 below — see the licensing separation
  rule below).

### Consequences of the omission — recorded, not ratified

The Soravo integration omitted Handy's text/language support layer
(`text.rs`, `lang_id.rs`) and introduced the Soravo-authored `post_process.rs`
substitute; the model catalog was reduced to `{}` (3 bytes) while its
Handy-authored reader — which asserts the catalog is non-empty — was preserved.
The resulting CI failures **MUST NOT** be classified as stale or incorrect
tests merely because the current Soravo implementation disagrees with them.
The preserved upstream tests are the integrity witnesses of the original
integration.

Correcting the record in this file is a **provenance correction only**. It does
not decide the treatment of any failing test, does not authorize any code
change, and does not ratify any open owner decision.

## Required source manifest

Before the next Handy-derived modification is merged, create a source manifest
containing all fields below:

1. upstream repository URL;
2. exact upstream commit SHA;
3. retrieval date/time;
4. license file/path and license text/hash;
5. exact Soravo commit that imported/adapted the source;
6. list of imported/adapted files;
7. per-file SHA-256 for the source snapshot;
8. modifications made after import;
9. files deliberately not reused and why;
10. model/weight sources separately from software sources.

A missing field is `UNKNOWN`, not an assumption.

Fields 1 and 2 are now filled (`https://github.com/cjpais/Handy` @
`ba10ce1943ef34e93c09494027fc0b9ced2e8a44`). Fields 4 through 10 are
**incomplete** and remain `UNKNOWN` where not evidenced above. An incomplete
manifest is a real state and must be recorded as one.

## RECOVERY RULE — RESTORE, DO NOT RE-FORK

**RESTORE-NOT-REFORK** is the standing recovery rule for this repository.

If exact Handy source exists at the verified pinned commit, and the Soravo
migration omitted or accidentally replaced it:

1. **Restore the exact upstream bytes.** Do not re-author, port, tidy,
   re-indent, or "improve" them.
2. **Prove blob identity / SHA-256** before and after restoration, for every
   restored file, against `ba10ce19`.
3. **Identify the minimum required dependency declarations** and record them
   explicitly, each with its evidence. Dependencies are a supply-chain
   decision, not a mechanical appendix to a restore.
4. **Do not introduce a second STT pipeline.**
5. **Do not special-case any language** (including Portuguese) to make a
   behaviour match. Restore the upstream *mechanism*; a language special case is
   itself a new Soravo divergence.
6. **Do not rewrite the Handy tests.** Preserved upstream tests are the
   integrity witnesses of the original integration.
7. **Do not add Soravo post-processing.**
8. **Do not perform an automatic Handy synchronization** — see
   *No automatic upstream synchronization* below. Restoring the pin is a
   restoration, not a synchronization with upstream `main`.
9. **Do not create a fresh Handy fork.** A fresh fork is justified only when a
   documented fresh-fork threshold is actually met. The threshold has four
   criteria: substantial *untraceable* divergence · systematic corruption ·
   irrecoverable provenance · repair cost exceeding safe incremental repair.
   Traced, bounded, byte-recoverable damage meets none of them.

This rule does not relax anything else in this file. Restoration is still
owner-gated where it alters live user-facing behaviour or reverses a ratified
ADR decision, and it still requires the full source manifest and the V1
behaviour-preservation checks below.

## Two separations that must never be collapsed

### Source recovery is not model/weight licensing

Restoring upstream source or data bytes does **not** approve that content for
distribution. Restoring `catalog.json` bytes — or any other upstream artifact
— is provenance preservation. It does **not** grant redistribution rights for
any model it names, and it does not discharge the per-model licence gate
(`20_ADR_INDEX.md` ADR-011; the `T10 — Model licensing` acceptance list in
`08_TASK_BREAKDOWN.md`).

The existing model licensing/provenance gate is **preserved unchanged**. The
software licence and each model weight's licence are separate gates; neither
discharges the other, and a weight licence is never inferred from the software
licence.

### Missing runtime assets are not source recovery

A missing runtime asset is a separate problem from a missing source file.
Restoreable source must not be conflated with assets that must be obtained.

**Never fabricate a model file, a VAD file, a licence, a hash, a mirror, or a
download URL.** The absence of `silero_vad_v4.onnx` from this repository is an
asset-acquisition gate with its own licence/provenance/checksum evidence
requirements; it is not repaired by restoring source, and restoring source does
not supply it.

## Reuse classification

Every desktop change MUST classify each touched subsystem as exactly one of:

- `HANDY-REUSE`: source retained substantially unchanged;
- `HANDY-ADAPT`: Handy source changed to satisfy Soravo contracts;
- `SORAVO-NEW`: no Handy equivalent was suitable;
- `HANDY-REPLACE`: prior Handy-derived implementation replaced;
- `SORAVO-OWNED`: product/security/payment/auth/model contract.

A task may not silently change classification.

## No automatic upstream synchronization

An upstream Handy update requires all of:

1. explicit task/ADR;
2. pinned old and new upstream SHAs;
3. source diff;
4. license/dependency review;
5. Soravo contract regression review;
6. model-license review if model handling changes;
7. platform build/test evidence;
8. updated source manifest;
9. focused PR.

No "pull latest Handy" operation is permitted as a default maintenance action.

## V1 behavior preservation requirements

Every change to a Handy-derived subsystem MUST verify:

- **V1 rule compliance**: no STT behavior modification without explicit justification
- **No post-processing layer**: no filler removal, normalization, punctuation rewriting, or language-specific output changes
- **Boundary compliance**: Soravo functionality implemented at wrapper level, not inside STT pipeline
- **Test conflict documentation**: any test requiring V1-out-of-scope behavior is STOP-gated

---

## Chain-of-custody acceptance

The Handy foundation is chain-of-custody VERIFIED only when:

- exact upstream identity is recorded;
- imported source is reproducible from that identity;
- license attribution is preserved;
- Soravo-specific modifications are enumerated;
- current `main` contains the recorded import/adaptation commit;
- targeted and broad CI-equivalent validation passes;
- V1 behavior preservation requirements are satisfied.

### Current status against these criteria

| Criterion | State |
|---|---|
| exact upstream identity is recorded | **MET** — `https://github.com/cjpais/Handy` @ `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` as the pin of record, with upstream origin and exact bytes established by blob identity |
| imported source is reproducible from that identity | **MET for the proven subset** (see *Recovered-source boundary*); the never-imported upstream files are byte-available at the pin but not yet restored |
| license attribution is preserved | **PARTIAL** — upstream is MIT and a `LICENSE` file exists at the pin; the exact licence text/hash for the imported snapshot is not yet recorded (manifest field 4) |
| Soravo-specific modifications are enumerated | **PARTIAL** — the omission and the `post_process.rs` substitution are now recorded; per-file post-import modifications are not yet enumerated (manifest fields 8 and 9) |
| current `main` contains the recorded import/adaptation commit | **MET for `a156c8c9`** (ancestor of `origin/main`) |
| targeted and broad CI-equivalent validation passes | **NOT MET** — the `rust` CI job is red |
| V1 behavior preservation requirements are satisfied | **NOT MET** — four explicit v6 §04 Do-Not-Modify behaviours are altered by `post_process.rs` |

**Therefore the Handy foundation is NOT chain-of-custody VERIFIED.** The prior
statement in this file — that upstream identity itself was `UNKNOWN` — is now
**HISTORICAL/STALE** and must not be carried forward: the identity is resolved.
Full provenance verification remains `BLOCKED`/`UNKNOWN` on the incomplete
manifest fields, the outstanding licence/hash evidence, and the failing CI, so
release readiness still cannot claim full provenance verification.

Recording a corrected identity is not a licence to merge, ship, or restore
anything. Every open owner decision recorded in `PROGRESS.md` remains open.
