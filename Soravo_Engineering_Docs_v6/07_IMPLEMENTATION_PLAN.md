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
- missing modules/functions created during the integration.

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
