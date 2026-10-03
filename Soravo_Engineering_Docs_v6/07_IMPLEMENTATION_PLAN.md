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

### Phase 7 — Release engineering
Build/sign/package, checksums, download verification, clean-machine install and
rollback plan.

### Phase 8 — Soravo visual redesign
Use `DESIGN.md`. Preserve functional/auth/payment contracts.
`DESIGN.md` is the authoritative design specification.

## Current recovery boundary

Do not combine desktop dependency recovery with:

- payment redesign;
- auth architecture changes;
- database migration reconciliation;
- visual redesign.

Each is a separate task/branch unless an ADR explicitly couples them.
