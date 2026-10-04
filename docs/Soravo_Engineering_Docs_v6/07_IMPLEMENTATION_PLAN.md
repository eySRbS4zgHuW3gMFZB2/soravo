# 07 — Implementation Plan

## Phase order

### Phase 0 — Control plane
Documentation pack, source-of-truth rules, skills/MCP inventory, state audit.

### Phase 1 — Repository/CI baseline
Make CI gates truthful and reproducible.

Required gates:
- web lint/typecheck/test/build;
- Rust fmt/clippy/test;
- cargo audit/deny;
- desktop build;
- relevant integration tests;
- security checks.

### Phase 2 — Handy foundation recovery
Recover the current Handy-derived desktop foundation without creating a second
desktop stack.

Current known migration families:

- GTK 0.11 / GTK4 layer-shell API;
- `hf-hub` 1.0 repository/cache API;
- `rodio` 0.22 / CPAL 0.17 compatibility;
- Tauri tray/image API;
- missing workspace crate membership/dependencies;
- missing modules/functions created during the integration;
- **Handy subsystems omitted or replaced during the original integration.**

### Recovery order — RESTORE BEFORE ANY FRESH FORK

When a Handy-derived subsystem is found to be missing, substituted, or
divergent, recovery is attempted in exactly this order:

1. **Establish upstream identity.** Resolve the exact upstream repository and
   commit, proved by blob identity rather than inference. Record it in
   `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`. The current verified pin is
   `https://github.com/cjpais/Handy` @
   `ba10ce1943ef34e93c09494027fc0b9ced2e8a44`.
2. **Determine whether the damage is traced, bounded, and byte-recoverable.**
   If it is, the correct action is **RESTORE, DO NOT RE-FORK** — see
   `04_HANDY_FORK_AND_REUSE_POLICY.md` *Recovery rule* and
   `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` *RECOVERY RULE*.
3. **Restore the exact pinned upstream bytes** and prove blob identity /
   SHA-256 for every restored file, before and after.
4. **Identify the minimum required dependency declarations.** Record each one
   explicitly with its evidence. Anything absent from the lockfile is a
   supply-chain gate requiring its own review, not a mechanical step.
5. **Only then** consider whether a fresh fork is justified — and only against
   the documented four-criterion fresh-fork threshold. A traced, bounded,
   byte-recoverable omission meets none of the criteria and MUST NOT trigger a
   re-fork.

**Accidental omission is repaired by exact pinned-source restoration, not by
re-fork and not by authoring a replacement.** A Soravo-authored substitute for
source that exists upstream is itself the defect.

**Restoration is owner-gated** where it alters live user-facing behaviour or
reverses a ratified ADR decision, and it must be carried out without:

- introducing a second STT pipeline;
- special-casing any language to reach the required behaviour;
- rewriting, removing, relocating, ignoring, or annotating the Handy tests;
- adding Soravo post-processing;
- performing an automatic Handy synchronization;
- treating a restored data file as licence approval to ship its contents, or
  treating a missing runtime asset as something a source restore supplies.

Dependency rule:

1. inspect `Cargo.lock`;
2. identify exact resolved version;
3. read current official API;
4. inspect all affected call sites;
5. make the smallest compatible change;
6. run the narrowest compile/test;
7. run package/workspace validation;
8. only then consider pinning/downgrading;
9. record any major strategy change in an ADR.

Do not perform broad dependency upgrades while repairing an unrelated subsystem.

### Phase 3 — Functional desktop integration
Verify session, audio, VAD, transcription, typing, overlay, settings, tray,
history, model installation and entitlement behavior.

### Phase 4 — Model provenance and benchmark
Every shipped model needs independent license/provenance/checksum evidence.
Unknown model licensing blocks release of that model.

Run the benchmark protocol with fixed hardware, corpus, build and methodology.

### Phase 5 — Payment
Lifetime TEST E2E, then monthly TEST E2E, then release-readiness review.

### Phase 6 — Security and full QA
Security review, regression, TestSprite supplemental coverage, CI-equivalent
validation.

> **Clarified by T34-Y (2026-10-04), additive only — nothing above is removed,
> narrowed, or made optional.** "Full QA" here means the security review,
> regression, TestSprite supplemental coverage and CI-equivalent validation. It
> does **not** mean final E2E QA. Final E2E QA is a dedicated pass executed
> **after** the Phase 8 redesign — see *Remaining sequence* below and
> `13_DEFINITION_OF_DONE_AND_QA.md` *Final E2E QA*. Regression and TestSprite
> coverage in this phase remain required and are not deferred.

### Phase 7 — Release engineering
Build/sign/package, checksums, download verification, clean-machine install and
rollback plan.

> **Clarified by T34-Y (2026-10-04), additive only — nothing above is removed,
> deferred, narrowed, or made optional.** This phase is split **by position in
> the sequence**, not by removal. The obligations here that do not depend on the
> shipped UI (reproducible build/sign/package configuration, checksum generation,
> download-verification wiring, rollback plan) are completed **before** the Phase
> 8 redesign, so the redesign is validated against release-capable foundations.
> The obligations here that must observe the shipped artifact (clean-machine
> install, download verification, release rehearsal) are executed **after** the
> redesign and after final E2E QA, against the final UI and the release
> candidate. Every obligation listed above still applies; none is discharged
> early. Signing credentials remain external secrets (`17_RELEASE_RUNBOOK.md`).

### Phase 8 — Soravo visual redesign
Use `DESIGN.md`. Preserve functional/auth/payment contracts.
`DESIGN.md` is the authoritative design specification.

> **Clarified by T34-Y (2026-10-04), additive only.** Consistent with ADR-010
> (UI overhaul deferred until functional/release gates), the redesign starts only
> after the Phase 6 and Phase 7 preconditions are in place. The redesign must not
> be used to avoid, defer, or weaken the functional, security, licensing,
> benchmark, or final-QA work, and it may not alter auth, payment, IPC, privacy,
> entitlement, or any other established product contract without an explicit ADR.

## Remaining sequence — deterministic order for the work that is left

Recorded by T34-Y (2026-10-04) so the remaining roadmap is unambiguous. Phases
0–5 are historical and their recorded outcomes are not rewritten here; this
sequence governs **only** what remains. Nothing below authorizes implementation,
and no step may begin before its predecessor's stated condition is met.

| # | Step | Done when | Current state (T34-Y) |
|---|---|---|---|
| **R1** | Finish remaining functional desktop/product gaps | Every desktop path that is not BLOCKED on a named external asset or data gate is closed, or its blocker is recorded and accepted | **REMAINING** |
| **R2** | Complete model provenance/licensing for anything intended to ship | Every shipped model has artifact, publisher, source, licence, commercial-use, redistribution, hosting, checksum and provenance evidence, and an explicit release decision | **REMAINING** — `T10`/`08` acceptance is not satisfied for the shipping catalogue; unknown licence = BLOCKED for that model |
| **R3** | Execute the real STT benchmark protocol and performance validation | `16_TEST_AND_BENCHMARK_PROTOCOL.md` is executed on fixed hardware/corpus/build/method and raw evidence is retained | **REMAINING** — `crates/stt/src/benchmark.rs` exists; no protocol execution evidence recorded |
| **R4** | Complete remaining security/release-foundation validation | The outstanding items in `12_SECURITY_BASELINE.md` and the security-review portion of Phase 6 are closed | **REMAINING** |
| **R5** | Complete release-engineering preparation needed before final UI validation | Phase 7 preconditions that are independent of the shipped UI are in place | **REMAINING** |
| **R6** | Perform the full Soravo visual/UI/UX redesign using `DESIGN.md` | The redesign is complete against `DESIGN.md` with functional/auth/payment/IPC/privacy/entitlement contracts preserved | **REMAINING** — not started |
| **R7** | **After** the redesign: execute FINAL full E2E QA against the redesigned product | A dedicated final validation pass has been executed against the redesigned product and its evidence recorded | **REMAINING** — see the rule below |
| **R8** | Clean-machine/runtime/install/package validation against the final UI and release candidate | Clean-machine install, launch, installer/updater and download verification pass on the release candidate | **REMAINING** |
| **R9** | Final release/signing/checksum/download/release rehearsal | Signing, checksums, download verification and the release rehearsal are complete | **REMAINING** |
| **R10** | Release | Only after the Definition of Done (`13`) and every precondition in `17_RELEASE_RUNBOOK.md` are satisfied | **REMAINING** |

### FINAL E2E QA — what it means, and what it does not

**Final E2E QA (R7) is a dedicated validation pass executed AFTER the Phase 8
visual/UI/UX redesign is complete.** It is a distinct step, not a synonym for a
green CI job.

- **A green `e2e` CI job does NOT mean final E2E QA is complete.** A green `e2e`
  run on any commit proves only that the Playwright suite passed against *that*
  commit's UI. It is not evidence about the redesigned product.
- **Existing E2E tests are NOT to be discarded, weakened, skipped, or made
  vacuous.** The current `tests/e2e/` suite (`auth.spec.ts`,
  `navigation.spec.ts`, `admin.spec.ts`) and the required `e2e` CI context stay
  in place and keep running on every commit for the whole of development. They
  remain the **regression and functional coverage** that guards the product
  against change.
- **What R7 adds** is a deliberate, separately recorded validation pass executed
  against the redesigned product once R6 is complete, per `13`'s L3/L4 levels
  and `16`'s protocol.
- **R6 must not weaken R7.** The redesign may not use "we will validate it later"
  as licence to alter auth, payment, IPC, privacy, entitlement, or any other
  established product contract. Doing so requires an explicit ADR
  (`01_AUTHORITY_AND_SOURCE_OF_TRUTH.md`, *Architecture changes*); the redesign
  is not that ADR.
- **Do not start R6 before R1–R5 are in place.** The redesign must not be used to
  avoid the functional, security, licensing, or benchmark work.

### Status vocabulary for the remaining sequence

`COMPLETED` · `IN PROGRESS` · `REMAINING` · `BLOCKED` · `DEFERRED`.

`COMPLETED` is recorded only where repository or live GitHub evidence exists.
`IN PROGRESS` requires a live branch/PR. `BLOCKED` requires a **named**
prerequisite. `DEFERRED` means deliberately postponed and must name the reason
and the document or ADR that defers it. No completion percentage is claimed for
this sequence; each step is binary and evidenced.

## Current recovery boundary

Do not combine desktop dependency recovery with:

- payment redesign;
- auth architecture changes;
- database migration reconciliation;
- visual redesign.

Each is a separate task/branch unless an ADR explicitly couples them.
