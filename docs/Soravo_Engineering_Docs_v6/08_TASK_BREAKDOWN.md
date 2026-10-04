# 08 — Deterministic Task Breakdown

Tasks are atomic. Do not begin a later task while its prerequisite is BLOCKED
unless an ADR explicitly authorizes parallel work.

## T01 — State audit
Acceptance:
- local SHA and origin SHA recorded;
- branch/worktree recorded;
- CI/deployment state recorded;
- dirty work classified;
- MCP/skills inventory recorded.

## T02 — CI baseline restoration
Acceptance:
- web lint passes;
- Rust fmt passes;
- required desktop crates are workspace members or explicitly excluded;
- desktop build gate has a reproducible failure or PASS;
- root test commands collect the intended suites.

## T03 — Handy source chain-of-custody
Acceptance:
- exact upstream repo + SHA recorded;
- import/adaptation files enumerated;
- license evidence recorded;
- `842acdf9` is either proven relevant or explicitly retired as stale;
- no provenance claim remains UNKNOWN without a blocker.

### T03 additional acceptance — recovery provenance (RESTORE, DO NOT RE-FORK)

These apply to every restoration of omitted or accidentally replaced
Handy-derived source. Full rule: `04_HANDY_FORK_AND_REUSE_POLICY.md`
*Recovery rule* and `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`.

- **exact upstream identity**: repository and the exact pinned commit SHA
  recorded as the pin of record, with upstream origin and exact byte content
  established by blob identity (git blob SHA of an imported file equal to the
  upstream blob at the pin) — never inferred from a filename, a similar commit,
  or a report. Where a blob is unchanged across several upstream commits, that
  limitation must be recorded rather than glossed;
- **no Soravo commit recorded as Handy provenance**: any SHA cited as an
  upstream identity is confirmed to exist in the upstream repository;
- **blob-level provenance for every restored file**: each restored file's
  upstream path, upstream blob SHA, and byte size recorded, plus SHA-256 of the
  restored local file, verified equal before and after the restore;
- **recoverability established**: each damaged artifact confirmed available
  verbatim at the pin, or the restoration is recorded `BLOCKED`;
- **damage characterized**: traceable to identifiable commits, bounded in
  scope — recorded explicitly, because this is what forecloses a re-fork;
- **fresh-fork threshold evaluated and recorded**: all four criteria explicitly
  marked met/not-met. If none is met, a fresh fork is not authorized;
- **substitution removed, not kept**: any Soravo-authored replacement with no
  upstream counterpart is removed in the same change, with its rollback path;
- **caller-side correctness proven**: the restored file is confirmed to be the
  provider of the symbols its caller imports, so the restore cannot be
  incomplete;
- **dependency delta declared explicitly**: each added dependency named with
  its version and whether it is new to the lockfile; lockfile deltas recorded
  with new-package counts;
- **tests untouched**: no Handy test rewritten, removed, relocated, ignored, or
  annotated as part of a restore;
- **no special-cased language**: no language-specific branch introduced as a
  substitute for the restored mechanism;
- **no second STT pipeline and no Soravo post-processing** introduced;
- **not a synchronization**: the restore targets the pin; adopting upstream
  `main` instead is a separate upstream-synchronization task requiring the
  nine-item process in `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`;
- **licensing and asset separation preserved**: restoring bytes is recorded as
  distinct from approving distribution, and from acquiring a missing runtime
  asset. No model, licence, hash, mirror, or download URL is fabricated;
- **provenance record updated in the same change**:
  `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` is updated so the record never again
  records a resolved identity as `UNKNOWN`.

## T04 — Desktop compiler recovery
Acceptance:
- reproduce first compiler error;
- fix only the first coherent root cause;
- targeted compile passes;
- no broad unrelated dependency churn.

## T05 — GTK/layer-shell
Acceptance:
- exact installed `gtk4-layer-shell` API verified;
- correct trait imported;
- overlay behavior preserved;
- Linux-specific code remains isolated;
- non-Linux build unaffected.

## T06 — hf-hub
Acceptance:
- locked `hf-hub` API verified;
- model/cache/revision code compiles;
- download/cache tests pass;
- no use of private upstream APIs.

## T07 — rodio/CPAL
Acceptance:
- one coherent CPAL version strategy;
- no incompatible CPAL types crossing APIs;
- feedback path tested;
- capture path remains unchanged unless required;
- strategy documented in ADR if versions must be changed.

## T08 — Missing crate/workspace reconciliation
Acceptance:
- every crate is workspace member or explicitly excluded;
- dependencies match actual imports;
- no dependency is added solely to suppress an error;
- lockfile is reproducible.

## T09 — Handy branding/rebrand
Acceptance:
- no user-facing Handy branding remains where Soravo branding is required;
- required attribution/license notices remain;
- source classification report exists.

## T10 — Model licensing
Acceptance:
- exact artifact;
- publisher;
- source URL;
- license;
- commercial use;
- redistribution;
- hosting;
- checksum;
- provenance;
- release decision.

Unknown license = BLOCKED for that model.

## T11 — STT benchmark
Acceptance:
- fixed corpus/hardware/build;
- latency/resource/quality measurements;
- raw evidence retained;
- no unsupported performance claims.

## T12 — Payment E2E
Acceptance:
- lifetime TEST path complete;
- monthly TEST path complete;
- webhook signature/ledger/entitlement evidence;
- account display verified;
- desktop recognition verified where applicable.

## T13 — Website redesign
Acceptance:
- implement `DESIGN.md`;
- preserve auth/payment behavior;
- no third-party brand assets;
- responsive/accessibility/visual regression evidence.

## T14 — Release
Acceptance:
- required CI green;
- desktop artifacts reproducible;
- model licenses clear;
- payment release gate clear;
- security complete;
- clean-machine install passes.

## T15 — FINAL full E2E QA (executed AFTER the T13 redesign)
Acceptance:
- a dedicated final validation pass has been **executed** against the redesigned
  product, not merely planned;
- it runs the levels `13` requires for final acceptance (L3 E2E and the L4
  release smoke scope), plus `16`'s protocol where it applies;
- raw evidence is recorded: what was executed, against which commit, on which
  platforms, with what results;
- failures found are fixed and the pass re-executed; a red result is recorded as
  `BLOCKED`/`FAILED`, never as a pass.

**This task does not exist before T13 is complete.** It is the post-redesign
validation pass, and it is not satisfied by a green `e2e` CI job.

## Execution order — added by T34-Y (2026-10-04)

The T01–T15 numbering above is the stable task-id sequence and is not renumbered
by this section. This section only fixes **the order in which the remaining
tasks execute**, and it does not modify any acceptance criterion above.

```text
  remaining functional desktop/product gaps      (T03 / T04–T08 completion work)
→ model provenance + licensing for shipped models (T10)
→ real STT benchmark protocol execution           (T11)
→ remaining security / release-foundation work    (Phase 6 security review)
→ release-engineering preparation                 (T14 — preparation portion only)
→ full Soravo visual/UI/UX redesign               (T13)
→ FINAL full E2E QA against the redesigned product (T15)
→ clean-machine / runtime / install / package     (T14 — validation portion)
→ signing / checksum / download / release rehearsal(T14 — rehearsal portion)
→ release                                        (T14 — gate closure, requires 13 + 17)
```

**T14 is split by function, not renumbered.** Its *preparation* obligations
(reproducible build/sign/package configuration, checksums, download-verification
wiring, rollback plan) are performed **before** T13. Its *validation and
rehearsal* obligations (clean-machine install, signing, download verification,
release rehearsal) are performed **after** T15, against the final UI and the
release candidate. Its acceptance criteria above are unchanged; only their
position in the sequence is fixed.

**Existing E2E tests are not discarded.** The `tests/e2e/` suite and the
required `e2e` CI context remain in place and continue to gate every merge
throughout. They are the regression and functional coverage. T15 is an
*additional*, dedicated pass executed after T13 — not a replacement, and not
something a green `e2e` CI job can stand in for.

**T13 may not weaken the contracts that T15 verifies.** The redesign must not
alter auth, payment, IPC, privacy, entitlement, or any other established product
contract without an explicit ADR.

## Current state by remaining step

Recorded by T34-Y (2026-10-04) from repository and live-GitHub evidence. No
completion percentage is claimed; each step is binary.

| Step | State | Evidence / named blocker |
|---|---|---|
| Remaining functional desktop/product gaps | **REMAINING** | `T33-DESKTOP-V1-FUNCTIONAL-GAP-AUDIT.md` maps the desktop path set; parts are BLOCKED on named external assets/data (Silero VAD asset, licence-verified catalogue, downloaded model) that must not be fabricated |
| Model provenance/licensing for shipped models | **REMAINING** | `T10` acceptance not satisfied for the shipping catalogue. Unknown licence = BLOCKED for that model |
| Real STT benchmark protocol | **REMAINING** | `crates/stt/src/benchmark.rs` exists; no protocol execution evidence recorded |
| Remaining security / release-foundation validation | **REMAINING** | `12_SECURITY_BASELINE.md` obligations not all closed |
| Release-engineering preparation | **REMAINING** | `17_RELEASE_RUNBOOK.md` preconditions unsatisfied; signing credentials remain external secrets |
| Soravo visual/UI/UX redesign (`T13`) | **REMAINING** | Not started; gated on the rows above per ADR-010 |
| **FINAL full E2E QA (`T15`)** | **REMAINING** | Cannot begin until `T13` completes. **A green `e2e` CI job is not this step** |
| Clean-machine / install / package validation | **REMAINING** | Requires the final UI and the release candidate |
| Signing / checksum / download / release rehearsal | **REMAINING** | Requires external signing credentials and the rehearsal run |
| Release | **REMAINING** | Requires `13` Definition of Done and every `17` precondition |

**Standing BLOCKED item, carried and unchanged:** ADR-031's independent-review
requirement remains unsatisfiable for any high-risk change while the repository
has a single collaborator, so any HR-classified change is STOP-and-report. This
does not block the normal-risk work above.
