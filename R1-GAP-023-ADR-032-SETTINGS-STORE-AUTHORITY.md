# R1-GAP-023 — ADR-032 — Settings-Store Authority (two stores, one canonical source of truth)

- **Task:** R1-GAP-023 · **Date:** 2026-10-08
- **Repository:** `eySRbS4zgHuW3gMFZB2/soravo`
- **Base commit at adoption:** `0d38eb4b` (`origin/main`, merge of PR #107)
- **Adopts:** `R1-GAP-023-SETTINGS-STORE-PROPOSAL.md` §8 **Option A**, exactly as
  recommended there.
- **Owner direction:** the R1-GAP-023 task instruction ("Adopt Option A from the
  existing R1-GAP-023 proposal … Do not ask the owner to choose. Make the
  technical decision."). This ADR is that decision, recorded.
- **Status:** **ACCEPTED (owner-directed)** — architecture only. See
  §9 for exactly what this ADR does and does not authorize.
- **Supersedes:** nothing. **Amends:** nothing. No ADR text is amended; the
  wording correction in §3.4 is recorded here as the governing statement.

**Index entry:** `docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md` (ADR-032).

---

## 1. Context

Two independently persisted settings stores exist. Neither reads the other at
load time. Both work. Every reader and writer was re-verified against current
source for this ADR; nothing below is carried forward from an earlier report
without a fresh read.

| | Canonical | Compatibility |
|---|---|---|
| Type | `AppSettings` (`apps/desktop/src-tauri/src/settings.rs`) | `soravo_config::Settings` (`crates/config/src/lib.rs`) |
| Provenance | **HANDY-REUSE** | **SORAVO-NEW** (no Handy equivalent) |
| Persistence | `tauri-plugin-store`, `store_path(SETTINGS_STORE_PATH)` (`settings.rs:1015`, `1211`), `SETTINGS_STORE_PATH = "settings_store.json"` (`:856`), key `"settings"` | whole-file JSON at `<config_dir>/soravo/settings.json` (`config::Settings::config_path`) |
| Schema | `CURRENT_SETTINGS_SCHEMA_VERSION = 2` (`:523`), per-field salvage on parse failure (`:1067`, #1619), migrations (`:1100`), binding backfill (`:1036`) | `SCHEMA_VERSION` + `migrate()`; camelCase/snake_case alias bridge; missing file → defaults |
| Size | ~60 fields, incl. `bindings`, `shortcut_activation`, `selected_model`, `selected_microphone`, `post_process_api_keys: SecretMap` (secrets) | 4 sections: `schema`, `microphone`, `hotkey`, `model`. **No secrets.** |

Registering the IPC surface: `load_settings` (`commands/soravo_ipc.rs:223`),
`save_settings` (`:240`), `update_microphone_settings` (`:257`),
`update_hotkey_settings` (`:284`), `update_model_settings` (`:311`), all backed
by `soravo-config` file persistence.

### 1.1 Canonical readers (runtime behaviour reads this store)

- **Microphone** — `managers/audio.rs:464`, `:476`, `:542`, `:546`;
  `commands/audio.rs:217` (`set_selected_microphone`), `:238`
  (`get_selected_microphone`).
- **Hotkey** — `shortcut/handler.rs:44` (`settings.shortcut_activation` decides
  recording activation), `shortcut/mod.rs:115/177/206/250/305`
  (`settings.bindings`), `shortcut/mod.rs:585`
  (`change_shortcut_activation_setting`), `secure_input.rs:481`.
- **Model** — `commands/models.rs:74`, `:81`, `:115`, `:126`, `:154`;
  `get_current_model` (`:174`) returns `AppSettings.selected_model`;
  transcription loads `settings.selected_model`.
- **Tray, theme, audio, autostart, overlay, paste, post-process, VAD** — same
  store, same functions.

Canonical writers: `commands/audio.rs` (6 sites), `commands/transcription.rs:18`,
`commands/history.rs:118/147`, `commands/models.rs:81/126/154`,
`shortcut/mod.rs` (8 sites), `commands/mod.rs:105`, onboarding/migrations.

### 1.2 Compatibility readers (UI-local)

`general-settings.tsx:9`, `microphone-settings.tsx:11`,
`shortcut-settings.tsx:9`, `model-settings.tsx:52`, and
`pill.tsx:60` (reads `hotkey.mode` **for pill label rendering only**; the
recording activation itself is `AppSettings.shortcut_activation` via
`shortcut/handler.rs:44`).

---

## 2. Decision

**Two stores, one owner each, one canonical source of truth.**

1. **Canonical store — the sole source of truth for runtime behaviour.**
   The Handy-derived `AppSettings` document
   (`apps/desktop/src-tauri/src/settings.rs`, `settings_store.json`, key
   `"settings"`). Every behaviour decision reads it. It is not moved,
   reshaped, re-keyed, re-pathed, or migrated by this ADR, and no ADR-018 /
   ADR-019 V1-preservation obligation is relaxed.
2. **Compatibility store — UI-local persistence, never authoritative.**
   `soravo-config` (`<config_dir>/soravo/settings.json`). It exists to satisfy
   the typed settings IPC contract and to render settings sections. **It never
   decides behaviour.** A compatibility value that no canonical value backs is a
   UI preference, not a setting.

### 2.1 Mirror direction

**One way, canonical → compatibility.** Three normative clauses:

- **Direction.** Only a canonical value may overwrite a compatibility value.
  Nothing may copy a compatibility value into the canonical store. The
  compatibility crate has no API that can, and none is added.
- **Trigger.** Only a *successful canonical write* may mirror. Never a load,
  never a read, never startup, never a failed or rejected canonical path.
  A canonical write that persists and then reverts on failure
  (`commands/models.rs:126` writes early, `:150–155` reverts) is mirrored only
  once it has settled, from the canonical value as it then stands.
- **Direction is enforced structurally.** `crates/config/src/mirror.rs`
  exposes the projection through `MirrorCanonical`, a token implementable only
  by a caller that has just completed a canonical write, so
  `mirror_on_canonical_write` cannot be wired to a read or a load path.

### 2.2 Mirrorable concepts and their exact rule

| Concept | Canonical | Compatibility | Rule |
|---|---|---|---|
| Model | `selected_model: String` | `model.selected_model: Option<String>` | Empty/unset → `None`, never `Some("")`. |
| Microphone | `selected_microphone: Option<String>` | `microphone.selected_device_name: Option<String>` | `None` (or empty) → `None`. |
| Hotkey mode | `shortcut_activation: ShortcutActivation` | `hotkey.mode: hold_to_talk \| toggle_to_talk` | `PushToTalk → hold_to_talk`, `Toggle → toggle_to_talk`, **`HoldOrToggle → skip and record**. |

### 2.3 Deliberately not mirrored (canonical-owned, unrepresentable)

These are **not** approximated, because approximating them would make the
compatibility store assert something the canonical store does not say:

- **`ShortcutActivation::HoldOrToggle`** — the upstream default and the value
  most users actually have (`settings.rs:913`, variant `:171`). The
  compatibility enum has no third variant. The mirror leaves `hotkey.mode`
  untouched and records the skip. This is the sharpest live ambiguity in the
  repository today: the Shortcut settings section's Mode control cannot express
  the canonical state, and after this ADR it is **documented as
  non-authoritative** rather than silently wrong.
- **`bindings` → `hotkey.binding`** — the canonical value is a structured
  `HashMap<String, ShortcutBinding>`; the compatibility field is a
  display-only `Option<String>`. Rendering it would fabricate an upstream
  textual format (v6 §21 never-fabricate). Not mirrored.
- **`microphone.selected_device_index`** — no canonical counterpart; it indexes
  a UI-local list. Compatibility-owned.

### 2.4 Conflict resolution

**Canonical always wins, unconditionally, and without consulting the
compatibility value.** There is no timestamp comparison, no last-writer-wins,
no merge. A compatibility value that disagrees is either overwritten (on the
next successful canonical write) or reported as divergence (§2.6). The
compatibility store can never win a conflict.

### 2.5 Startup behaviour

**Startup is a no-op for both stores' relationship.** `Settings::load` performs
no reconciliation and overwrites nothing. Each store loads, salvages, and
migrates exactly as it did before. Re-projecting on load would be the silent
migration this ADR defers. The v1→v2 compatibility-schema migration is
**value-preserving**: it stamps `schema.version = 2` and adds a defaulted
`mirror` block, and rewrites no user setting.

### 2.6 Failure behaviour

- **Canonical load/salvage failure** — the canonical store's own hardening
  applies unchanged (per-field salvage, `settings.rs:1067`). This ADR adds
  nothing and weakens nothing.
- **Mirror not applicable / unrepresentable** — the compatibility value is left
  exactly as it is and the skip is recorded in `mirror.last`.
- **Mirror write failure (I/O)** — the canonical write has already succeeded and
  is authoritative. A failed mirror persistence must never roll back, reject, or
  invalidate the canonical write; the compatibility store simply remains stale,
  and `divergence()` reports it. Canonical behaviour is unaffected.
- **Divergence detection** — `mirror::divergence()` reports, deterministically
  and read-only, which compatibility values differ from what the mirror rule
  would produce. A non-empty result means the compatibility value is stale or
  user-edited and must not be trusted for behaviour.

### 2.7 Migration and deprecation plan

- **Schema v1 → v2 (this ADR):** additive. `Settings` gains
  `mirror: MirrorState { applied, last }`, `#[serde(default)]`; every existing
  field and value is preserved verbatim. A pre-v2 file therefore carries
  `applied: 0`, which **proves** its values were never written by the mirror —
  an on-disk value can never be mistaken for a mirrored one. This is what makes
  the rule auditable across a restart rather than merely asserted.
- **Deprecation.** `soravo-config` is **not** deprecated by this ADR. It is
  reclassified from "undecided duplicate" to "declared compatibility store with
  a named owner and a normative direction". Retirement requires the Option B
  migration and a superseding ADR.
- **Later, in order:** (1) wire the already-tested mirror rule to the canonical
  write sites (`commands/audio.rs`, `shortcut/mod.rs`, `commands/models.rs`) —
  each of those files is Handy-derived, so each wiring is HR-5; (2) Option B
  migration of the four UI sections; (3) only then retire `crates/config`
  settings persistence. Steps 1–3 are separate tasks with separate ADRs and
  separate risk classifications.

---

## 3. Alternatives

### 3.1 Option B — migrate the UI onto `AppSettings` (DEFERRED, not rejected)

Correct long-term direction. Rejected **for this task only**: it rewrites four
UI sections and five IPC commands, migrates every existing
`<config_dir>/soravo/settings.json` once, touches Handy-derived persistence,
and needs full regression plus an owner-accepted migration release note. HR-1
plus HR-5, with real user-data-migration risk. Explicitly deferred.

### 3.2 Option C — migrate the runtime onto `soravo-config` (REJECTED)

Would move ~15 Rust runtime call sites off the Handy store, rewrite Handy
persistence behaviour, and strand the salvage (#1619) and migration hardening
that protects real users' configuration. Violates V1 preservation (ADR-018 /
ADR-019). Rejected outright.

### 3.3 Option D — read-through facade over both files (DEFERRED)

Adds an abstraction layer with canonical-wins plus one-way sync — the same ADR
requirement and roughly the same regression surface as Option B, for less
payoff, while the settings UI is pre-redesign. Revisit only if Option B is
abandoned.

### 3.4 Wording correction to the R1 blocker packet (recorded, not an amendment)

`R1-BLOCKER-DECISION-PACKET-2026-10-08.md` §4 frames Option A as "`soravo-config`
canonical for Soravo-owned account/model contract". That framing is inaccurate
and this ADR supersedes it as the governing statement: **`soravo-config` holds
no account data whatsoever** (four sections: `schema`, `microphone`, `hotkey`,
``model``), and its `model` field is a *mirror* of the canonical value, not a
second source of truth. There is exactly **one** canonical source of truth, and
it is `AppSettings`. The packet's *decision* (ratify Option A, defer B) is
unchanged; only the "two canonical stores" wording is corrected.

---

## 4. Security impact

- **No secret ever crosses the mirror.** The canonical `SecretMap`
  (`post_process_api_keys`, `settings.rs:453`, redacted `Debug`) has **no**
  counterpart in the compatibility store and no counterpart in
  `CanonicalSettings`. The compatibility store continues to hold no secret.
- **No secret on IPC** — unchanged. `SettingsResponse.data` still carries only
  the four compatibility sections; the additive `mirror` block contains a
  concept enum and two short strings (a device name, a model id, a mode name)
  and never an API key.
- **No new privilege, no new I/O target, no new secret handling.** The mirror
  is a pure function; persistence reuses the store's existing `save()`.
- **`Debug` redaction and the 100 KB `inject_text` bound** — untouched.
- **`12_SECURITY_BASELINE.md` — unchanged.** No baseline control was added,
  removed, or relaxed.

## 5. Performance impact

Negligible. The mirror is a pure, allocation-light projection over three
fields, executed only on a canonical write (user-initiated, not per-frame). No
hot path, no audio/transcription loop, and no additional file I/O is introduced
(`mirror_from_canonical` performs none; persistence is the existing `save()`).

## 6. Operational impact

- **No migration runs.** No user's files are rewritten by this ADR; the v1→v2
  migration is in-memory on load and value-preserving, exactly like the
  pre-existing v0→v1 step.
- **No new failure mode at startup.** Startup behaviour is byte-for-byte the
  same logic plus one additional `if version < 2` stamp.
- **Two files remain on disk.** Documented, not hidden: `settings_store.json`
  (authoritative) and `soravo/settings.json` (compatibility).
- **One user-visible cosmetic change:** `general-settings.tsx:33` renders
  `settings.schema.version`, which now reads `2` instead of `1`. That row
  reports the compatibility document's schema version and is not a behavioural
  setting.
- **Documentation debt is now explicit, not implicit:** the Shortcut settings
  section's Mode control and the Microphone section's device picker edit
  compatibility values that no runtime path reads. That is the honest state of
  the product and is recorded here so it is not rediscovered as a defect.

## 7. Testing impact

Implemented and green, focused on the six properties this ADR must prove:

| Required property | Test (`crates/config/src/`) |
|---|---|
| Canonical read | `mirror::tests::canonical_write_is_the_only_mirror_entry_point`, `canonical_cleared_microphone_projects_to_none`, `canonical_empty_model_projects_to_none_never_empty_string` |
| Canonical write | same — plus `MirrorCanonical` being the only entry point |
| Mirror behaviour | `mirror_preserves_every_compatibility_owned_field`, `records_are_emitted_in_stable_declaration_order`, `mirror_is_idempotent_and_reports_no_change_on_second_run`, `interaction_mode_round_trips_through_its_string_form` |
| Restart persistence | `mirror_state_survives_a_serialize_load_restart`, `missing_mirror_block_defaults_to_never_mirrored` |
| Conflict handling | `canonical_wins_and_compatibility_never_overwrites_canonical`, `unrepresentable_hot_or_toggle_is_skipped_not_approximated`, `unrepresentable_concept_is_never_reported_as_divergence`, `divergence_lists_only_mismatched_concepts_in_declaration_order` |
| Compatibility behaviour | `startup_load_reconciles_nothing_and_moves_no_value`, `pre_mirror_document_is_distinguishable_from_a_mirrored_one`, `v1_document_migrates_to_v2_without_touching_any_value`, `migration_is_idempotent_and_never_resurrects_stale_mirror_state`, `interaction_mode_parses_only_its_own_wire_forms` |

`soravo-config`: 21/21 pass (was 3/3; +18 new). `soravo-desktop --lib settings`
26/26 pass, unchanged — the Handy-derived store was not touched. Workspace
`cargo test`: all green. `cargo fmt --check` clean, `cargo clippy
-p soravo-config --all-targets --all-features` clean. Desktop `tsc -b` clean,
`eslint --max-warnings=0` clean, all 8 vitest files green (110 tests).

**Not required and not added:** any wiring test, because no wiring exists.

## 8. Rollback

`git revert` of the merge commit is sufficient and complete. The change is
additive Rust in one Soravo-owned crate plus documentation. Reverting removes
the `mirror` field and the v2 stamp; a document already stamped v2 would then
carry a version one higher than the crate's `SCHEMA_VERSION`, which the
pre-existing `migrate()` handles by leaving the value untouched — no value loss,
no external coordination, no secret rotation. No migration to undo.

## 9. Consequences

**Authorized by this ADR:** two stores kept; canonical store named and its
authority fixed; deterministic one-way mirror rule, conflict resolution,
startup and failure behaviour recorded; mirror rule implemented and proven as a
pure, tested function; additive compatibility-schema v2 with auditable mirror
provenance.

**Explicitly NOT authorized and NOT executed here:** wiring the mirror to any
canonical write site; any change to `settings.rs`, `commands/soravo_ipc.rs`, any
`#[tauri::command]`, any frontend or UI file, any Handy-derived source, any
dependency, lockfile, workflow, manifest, model, asset, payment, auth, or
upstream-synchronization change; and the Option B migration, which remains
deferred.

**Remaining settings work:** see §2.7 (wire-then-migrate-then-retire, each its
own task, ADR and risk classification).

---

## 10. Review note (recorded, non-normative)

One test caught one real defect during implementation: the microphone
projection initially mapped canonical "system default" to `Some("")` instead of
`None`, which would have written an empty device name into the compatibility
store. Fixed before merge and covered by
`canonical_cleared_microphone_projects_to_none`. Recorded because it is the
class of error this mirror can make — projecting an *absence* as an empty
*value* — and the fix is now a named test rather than an intention.