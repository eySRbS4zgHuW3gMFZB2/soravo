# 21 — Handy Source Identity and Chain of Custody

## Purpose

This file prevents the desktop foundation from becoming an unattributed or
unreproducible mixture of Handy code and Soravo code.

Handy is an implementation source, not a product or security authority.
Soravo owns the resulting product contracts.

## Current evidence state

Research HEAD: `2f96f3d21213bce24f049996d5ab897f16acd31b`

Known repository evidence:

- PR #55 (`docs: adopt Handy-derived desktop architecture v3`) is CLOSED and
  was NOT merged.
- Commit `a156c8c916b00f1da27010a88e08bcaef5b1d91f` later integrated 40+ Handy-
  derived source files into `main`.
- That commit explicitly recorded that the integration required additional
  dependencies and a later full build/test pass.
- The previously documented Handy pin `842acdf9` is not an ancestor of current
  `main`. Therefore it MUST NOT be treated as the current authoritative Handy
  source identity.
- The exact upstream Handy repository + exact source commit used for the
  integrated files is therefore currently `UNKNOWN`.

Unknown is intentional. Do not replace UNKNOWN with an inferred commit.

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

Until then, Handy provenance is `UNKNOWN` and release readiness cannot claim full provenance verification.
