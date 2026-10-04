# 17 — Release Runbook
Preconditions:
- required CI green;
- target desktop builds verified;
- model licenses verified;
- payment E2E verified;
- security complete;
- no unresolved P0/P1;
- reproducible artifacts.

Record commit, toolchain, artifact names, checksums and signatures.

macOS/Windows signing credentials remain external secrets.

After artifact publication:
- update download page;
- verify installers;
- verify updater;
- clean-machine install;
- verify account download links.

Do not switch Razorpay TEST to LIVE merely because code is ready. LIVE activation requires business/provider approval, LIVE secrets, production webhook configuration and approved production smoke process.

Rollback must preserve entitlement/payment integrity.

Source-merge authority (ADR-031, `14_CI_CD_AND_BRANCHING.md`) is separate from
release authority and satisfies none of the preconditions above. Merging into
`main` is not a release gate, authorizes no release, and closes no gate here.

## Position in the remaining sequence (added by T34-Y)

Added by T34-Y (2026-10-04). This records *where* these preconditions sit in the
remaining roadmap. It relaxes nothing above and adds no precondition.

- **Release-engineering preparation** that is independent of the shipped UI
  (reproducible build/sign/package configuration, checksum generation,
  download-verification wiring, rollback plan) is completed **before** the
  Soravo visual/UI/UX redesign, so the redesign is validated against
  release-capable foundations.
- **Signing, checksums, download verification, the clean-machine install and the
  release rehearsal** are executed **after** the redesign and after the final
  E2E QA pass, against the final UI and the release candidate. Validating
  artifacts built from a superseded UI would be validating the wrong thing.
- **Final E2E QA is a dedicated pass executed after the redesign** and is a
  release precondition in practice: release follows it. See
  `13_DEFINITION_OF_DONE_AND_QA.md` *Final E2E QA* and
  `08_TASK_BREAKDOWN.md` `T15`. A green `e2e` CI job is **not** that pass.
- The `clean-machine install` precondition above is therefore performed against
  the **final** UI and the release candidate, not against an interim build.

Sequence and full status table: `07_IMPLEMENTATION_PLAN.md` *Remaining
sequence*.
