# T33-N — WEB DEPENDENCY AUDIT FORENSICS + MINIMAL REMEDIATION — REPORT

**Task:** T33-N — WEB DEPENDENCY AUDIT FORENSICS + MINIMAL REMEDIATION
**Type:** STOP-GATED. Read-only investigation first; no modification of
`package.json`, `pnpm-lock.yaml`, source, CI workflows, tests, or
configuration until the forensic phase is complete and this report has
explicitly authorized the smallest remediation.
**Date:** 2026-09-30
**Branch:** `t31/soravo-wrapper-completion` @ `a8a4d151829525d675d225fe5fdd584856ff2ea1`
**PR:** #63 OPEN (`t31/soravo-wrapper-completion` → `main`,
`mergeStateStatus: BLOCKED`, `reviewDecision: REVIEW_REQUIRED`)
**Verdict:** Root cause PROVEN for all 6 findings. All three vulnerable
packages sit on `shadcn@4.21.0`-rooted production-declared paths, all three
fixed versions satisfy their parents' existing semver ranges, and the
smallest remediation — a transitive-only refresh of exactly three
snapshots with NO manifest change — eliminates ALL 2 HIGH + ALL
4 MODERATE findings. Routine, policy-authorized; NO owner decision, NO ADR
required. Implementation AUTHORIZED (§12).

---

## 1. Reading-gate proof (completed in the mandated order)

1. Root `SPEC_MANIFEST.json` (v2, 15-entry historical pack pointer) — read.
2. Canonical v6 manifest (`docs/Soravo_Engineering_Docs_v6/SPEC_MANIFEST.json`,
   pack v6.0.0, `file_count: 24`) — read.
3. All 24 canonical v6 documents in manifest order, in full, from the
   canonical path `docs/Soravo_Engineering_Docs_v6/`: 00 README (170 L,
   canonical, with gate + mirror disclosure), 01 authority, 02 product
   requirements (incl. V1 HANDY-CORE preservation), 03 technical design,
   04 fork/reuse policy (incl. RESTORE-NOT-REFORK + no-duplicate-stacks),
   05 desktop contracts, 06 web/cloud/payment, 07 implementation plan
   (incl. §07 dependency rule: smallest compatible change),
   08 task breakdown (incl. T10 licensing gate), 09 agent instructions
   (permanent discipline, reading gate, stop conditions),
   10 skills, 11 MCP tooling, 12 security baseline, 13 DoD/QA,
   14 CI/CD + failure classes A–F, 15 env/secrets, 16 test/benchmark,
   17 release runbook, 18 interruption/handoff, 19 state-audit protocol,
   20 ADR index of record (ADR-019 ACCEPTED, D-CATALOG = B in force),
   21 chain of custody (pin of record `ba10ce19`), DESIGN.md, manifest.
   The root-mirror copy `Soravo_Engineering_Docs_v6/` was byte-compared:
   only `00_README.md` + `20_ADR_INDEX.md` differ (banner-bearing, mirror
   pointers); the mirror was NOT used for authority. Root 15-doc pack
   treated as HISTORICAL/STALE per 09/O-5.
4. `PROGRESS.md` in full (5,018 lines through the T33-M entry; header +
   T33-I §4414–4623 + T33-J/K/L/M sections re-read this session, remainder
   scanned via section index + targeted reads; no statement reused without
   revalidation against GitHub/VM).
5. T33 reports, in full and first-hand (no conclusion accepted on report):
   `T33-M-WEB-CI-BRACE-EXPANSION-FORENSICS.md` (415 L),
   `T33-L-HANDY-CATALOG-RESTORATION-REPORT.md` (346 L),
   `T33-K-CATALOG-CI-FAILURE-FORENSICS-AND-DECISION-REPORT.md` (329 L),
   `T33-J-HANDY-V1-EXACT-SOURCE-RECOVERY-REPORT.md` (224 L),
   T33-I (no standalone file exists; the record is `PROGRESS.md` §T33-I,
   read in full) plus the three T33 Handy recovery reports' positions as
   cited in T33-I/J/K.
6. Fresh Git/branch/PR/CI audit this session (§2) — not inferred from
   PROGRESS.md or prior reports.
7. `package.json` (root, `apps/desktop`, `apps/website`),
   `pnpm-workspace.yaml`, `pnpm-lock.yaml` as they exist at the failing
   commit (§§4–5), plus `.github/workflows/ci.yml` (`web` job) and
   `.github/workflows/security-audit.yml` (`npm-audit` job).

T33-L catalog restoration was NOT reverted. Every dependency fact below
was re-derived first-hand from GH Actions failed logs, local
`pnpm audit --prod` reproduction, `pnpm why`, `pnpm-lock.yaml`, npm
registry metadata (`npm view`), and Git object inspection.

---

## 2. Exact CI evidence

| Item | Value |
|---|---|
| HEAD (local) | `a8a4d151829525d675d225fe5fdd584856ff2ea1` |
| Branch | `t31/soravo-wrapper-completion` (in sync with origin) |
| PR #63 head | `a8a4d151…` identical to local; OPEN, BLOCKED, 0/1 review |
| Latest failing CI run | `36668791974` — `CI`, `pull_request`, head `a8a4d151`, conclusion `failure` (11m10s, 2026-09-30T04:25:44Z) |
| Failing job | `web`, conclusion `failure` |
| Sibling jobs same run | `rust` SUCCESS · `e2e` SUCCESS · `desktop` SUCCESS |
| Companion run | Security Audit `36668791999` — `failure` (same npm cause, `pnpm audit --prod --audit-level=high`) |
| Prior identical-shape run | CI `36667412074` — `web` FAILURE, rest SUCCESS; Security Audit `36667412081` — FAILURE (same cause) |
| Pre-exposure run | CI `36660978480` (~02:41 UTC) — `web` SUCCESS on the IDENTICAL lockfile; flip to FAILURE by `36667412074` (~04:06 UTC) = live-advisory surfacing, zero manifest/lockfile delta |
| Failing step (CI) | `Run pnpm audit --prod` (`.github/workflows/ci.yml:26`), after lint/typecheck/test/build all PASSED |
| Failing step (Security Audit) | `Run npm audit` = `pnpm audit --prod --audit-level=high` (`security-audit.yml:53`) |
| Working tree | Only `PROGRESS.md` modified (this task's entry, uncommitted at forensic close) + pre-existing untracked `T*.md`/`reports/`-era paths; `package.json`, `pnpm-lock.yaml`, source, workflows untouched by the forensic phase |

Failure output (verbatim from both runs' `--log-failed` + local reproduction):
`6 vulnerabilities found` / `Severity: 4 moderate | 2 high` / exit code 1.
The full six-row table is inventoried in §4.

---

## 3. Local reproduction (pinned toolchain, read-only)

- `pnpm audit --prod` at HEAD `a8a4d151` (packageManager `pnpm@11.17.0`,
  node per CI 22): **6 vulnerabilities, 4 moderate | 2 high, exit 1** —
  byte-identical advisory set to CI runs `36668791974` / `36668791999`.
- `pnpm why brace-expansion` → exactly ONE resolved version (`5.0.9`)
  with the `shadcn` prod path + a parallel eslint dev path (excluded
  from `--prod`).
- `pnpm why fast-uri` → exactly ONE resolved version (`3.1.7`), all
  paths under `shadcn`.
- `pnpm why ip-address` → exactly ONE resolved version (`10.7.0`), all
  paths under `shadcn`.
- No `pnpm.overrides` / `pnpm.resolutions` key exists in any
  `package.json`. CI installs with `--frozen-lockfile`, so the audited
  graph IS the committed lockfile graph joined against the LIVE advisory
  feed — a newly published GHSA retroactively fails an unchanged
  lockfile.

---

## 4. Complete vulnerability inventory (all 6, production `--prod` graph)

| # | GHSA | Severity | Package | Installed | Vulnerable range | Fixed (`>=`) | Exact chain (workspace → vulnerable pkg) | Shipped/runtime or build/dev CLI |
|---|---|---|---|---|---|---|---|---|
| 1 | `GHSA-qhr7-859c-m2p7` | HIGH | `brace-expansion` | `5.0.9` | `>=4.0.0 <5.0.11` | `5.0.11` | `@soravo/desktop`‖`@soravo/website` (`dependencies`) → `shadcn@4.21.0` → `ts-morph@26.0.0` → `@ts-morph/common@0.27.0` → `minimatch@10.2.6` → `brace-expansion@5.0.9` (2 `Paths:` rows, one per app) | Build/dev CLI ONLY (§5) |
| 2 | `GHSA-6j4f-fj2g-mc7p` | HIGH | `brace-expansion` | `5.0.9` | `>=4.0.0 <5.0.10` | `5.0.10` | Same two shadcn paths as #1 | Build/dev CLI ONLY |
| 3 | `GHSA-q2hr-2g5m-vwhr` | MODERATE | `brace-expansion` | `5.0.9` | `>=4.0.0 <5.0.12` | `5.0.12` | Same two shadcn paths as #1 | Build/dev CLI ONLY |
| 4 | `GHSA-hrr3-gc8f-f4qj` | MODERATE | `fast-uri` | `3.1.7` | `>=3.0.0 <3.1.8` | `3.1.8` | Same workspace roots → `shadcn@4.21.0` → (`@dotenvx/dotenvx@1.75.1` → `conf@10.2.0` → `ajv@8.20.0`/`ajv-formats` → `fast-uri`) + (`@modelcontextprotocol/sdk@1.30.0` → `ajv@8.20.0`/`ajv-formats@3.0.1` → `fast-uri`); 8 `Paths:` rows | Build/dev CLI ONLY |
| 5 | `GHSA-j6r3-76f7-8jcv` | MODERATE | `ip-address` | `10.7.0` | `<=10.7.0` | `10.7.1` | Same roots → `shadcn@4.21.0` → (`@modelcontextprotocol/sdk@1.30.0` → `express-rate-limit@8.7.0` → `ip-address`) + (`socks@2.8.10` → `ip-address`); 4 `Paths:` rows | Build/dev CLI ONLY |
| 6 | `GHSA-h3mg-xc3c-68pw` | MODERATE | `ip-address` | `10.7.0` | `<=10.7.0` | `10.7.1` | Same 4 paths as #5 | Build/dev CLI ONLY |

Single-version cover: `brace-expansion@5.0.12` closes #1–#3 (HIGHs need
only `>=5.0.11`); `fast-uri@3.1.8` closes #4; `ip-address@10.7.1` closes
#5–#6. All three fixed versions exist in the registry (verified
`npm view` this session; `shadcn` latest IS `4.21.0`, i.e. no newer
shadcn to wait for).

---

## 5. Dependency graphs + reachability

Lockfile evidence at the failing commit (re-derived, T33-M §8 confirmed
unchanged):

- `brace-expansion@5.0.9` — single snapshot, integrity
  `sha512-ScQ4I…/Wxg==`; sole in-`--prod`-scope parent
  `minimatch@10.2.6` (`dependencies: brace-expansion: 5.0.9`).
- `fast-uri@3.1.7` — single snapshot, integrity
  `sha512-dOvZVz…uzVVHg==`; consumed via `ajv@8.20.0`
  (`dependencies: fast-uri: 3.1.7`).
- `ip-address@10.7.0` — single snapshot, integrity
  `sha512-BGFsyJ…CAMhA==`; consumed via
  `express-rate-limit@8.7.0(…)` and `socks@2.8.10`
  (`dependencies: ip-address: 10.7.0` in both).
- `minimatch@10.2.6` → npm range `brace-expansion: ^5.0.8`
  (verified `npm view minimatch@10.2.6 dependencies`).
- `ajv@8.20.0` → npm range `fast-uri: ^3.0.1` (verified).
- `express-rate-limit@8.7.0` → npm range `ip-address: ^10.2.0`
  (verified); `socks@2.8.10` → `ip-address: ^10.1.1` (verified).
  Every fixed version satisfies its parent range — NO parent upgrade
  required.

```
@soravo/desktop@0.1.0 (dependencies) ─┐
                                      ├─> shadcn@4.21.0 ─┬─> ts-morph@26.0.0 ─> @ts-morph/common@0.27.0 ─> minimatch@10.2.6 ─> brace-expansion@5.0.9 (VULN #1–#3)
@soravo/website@0.1.0 (dependencies) ─┘                  ├─> @dotenvx/dotenvx@1.75.1 ─> conf@10.2.0 ─> ajv@8.20.0 (+ajv-formats) ─> fast-uri@3.1.7 (VULN #4)
                                                         └─> @modelcontextprotocol/sdk@1.30.0 ─┬─> ajv@8.20.0 ─> fast-uri@3.1.7
                                                                                               ├─> express-rate-limit@8.7.0 ─> ip-address@10.7.0 (VULN #5–#6)
                                                         └─> socks@2.8.10 ─> ip-address@10.7.0
```

No `package.json` (root, apps, services, packages) declares
`brace-expansion`, `fast-uri`, or `ip-address` at any range — all three
are undeclared transitives; `shadcn@^4.21.0` (in `dependencies` of both
apps) is the only Soravo-declared package on any failing `--prod` path.

**Shipped/runtime vs build/dev CLI (proven this session):**

1. `shadcn` is a scaffolding CLI (`"bin": "./dist/index.js"`, engines
   `node >= 20.18.1`); zero `from "shadcn"` / `require("shadcn")`
   imports in `apps/website/src` or `apps/desktop/src` (grep CLEAN).
   The sole `shadcn` hit in shipped src is a CSS
   `@import "shadcn/tailwind.css"` in `apps/website/src/styles.css` —
   a build-time stylesheet reference resolved by Vite/Tailwind, NOT an
   import of the CLI's JS dependency tree (`ts-morph`, `minimatch`).
2. Zero `src` references to `brace-expansion`, `fast-uri`,
   `ip-address`, `ajv`, `minimatch`, or `ts-morph` in either app
   (grep CLEAN). `vite build` bundles `src`, not `node_modules/.bin`
   CLIs.
3. `brace-expansion` executes only when `minimatch` expands a glob —
   i.e. inside `ts-morph` project file-globbing during a `shadcn`
   code-generation run. `fast-uri` executes inside `ajv` URI-format
   validation of CLI config; `ip-address` inside the MCP SDK's
   rate-limit/proxy helpers vendored with the CLI. No Soravo runtime
   path (website request handler, desktop Tauri command,
   checkout/webhook Edge Function) passes attacker-controlled input to
   any of the three.
4. Severity consequence: **CI-gating HIGH, runtime LOW/NONE** for
   shipped artifacts. Genuine exposure is developer-workstation/CI
   execution of `shadcn` against untrusted globs/config — narrow,
   non-production. No evidence of exploitation; no reachable production
   vector found. (Static assessment: imports, bin shape, bundle
   boundary, lockfile. No dynamic bundle-content proof was run — that
   belongs to the verification in §10.)

---

## 6. Candidate remediations (facts + exact impact)

| ID | Mechanism | Fixes | Files changed | Direct deps changed | Transitive changed | Lockfile churn | New / removed pkgs | Semver valid? | Frozen-lockfile? | Runtime code change? |
|---|---|---|---|---|---|---|---|---|---|---|
| **R-A. Transitive-only refresh (SELECTED)** | `pnpm update brace-expansion@5.0.12 fast-uri@3.1.8 ip-address@10.7.1` (re-resolution under existing parent ranges), commit lockfile | ALL 6 (#1–#6) | 1 (`pnpm-lock.yaml` only) | 0 | 3 snapshots bumped (brace `5.0.9→5.0.12`, fast-uri `3.1.7→3.1.8`, ip-address `10.7.0→10.7.1` + integrity hashes) | 3 snapshot blocks; no other churn expected | 0 / 0 | YES — all within declared `^` ranges (proven §5) | YES after commit | NO |
| R-B. `pnpm.overrides` pin | Add `{"pnpm":{"overrides":{"brace-expansion":"5.0.12","fast-uri":"3.1.8","ip-address":"10.7.1"}}}` to root `package.json` + reinstall | ALL 6, plus future-proofing | 2 (`package.json` + `pnpm-lock.yaml`) | 0 (override key is policy, not a dependency) | Same 3 bumps, permanently pinned | Same 3 blocks + manifest key | 0 / 0 | YES | YES | NO |
| R-C. Parent-chain upgrade | New `shadcn`/`ts-morph`/`minimatch`/`ajv`/`express-rate-limit`/`socks` that re-pin fixed versions | Would fix IF upstream re-pinned | ≥2 + wide lockfile | ≥1 | Large (CLI behavior, templates, TS-compiler coupling via `ts-morph`) | Large | UNKNOWN (upstream-dependent) | N/A | YES | NO (but highest regression risk) |
| R-D. Move `shadcn` → `devDependencies` | Removes the `--prod` path entirely | Masks gate (audit graph changes, bytes may remain via other paths) | 3 (`apps/desktop/package.json`, `apps/website/package.json`, `pnpm-lock.yaml`) | 2 declarations moved | Graph re-scope | Medium | 0 / 0 | Semver N/A — semantic change | YES, but changes what `--prod` MEANS repo-wide | NO, but breaks any prod-install consumer of `shadcn` |
| R-E. Gate weakening / suppression | `--audit-level=critical`, ignore list, deleting the audit step | MASKS only; vulnerable bytes remain | 1 (workflow) | 0 | 0 | 0 | 0 / 0 | N/A | N/A | NO |

- R-C is NOT currently viable: `shadcn` latest IS `4.21.0` (verified),
  i.e. upstream has not shipped a re-pinned release; it also carries
  the largest blast radius (CLI templates + `ts-morph` compiler
  coupling) and waits on upstream.
- R-D changes dependency STRATEGY (the meaning of `--prod` for the
  whole repo) and needs build-pipeline proof (Tauri build, Docker/
  release images) + an ADR per v6 §01 (`dependency strategy` is an
  enumerated ADR trigger). Owner decision required — NOT a routine fix.
- R-E violates the task's explicit prohibitions and the v6 §12
  security baseline. REJECTED — recorded only so nobody proposes it
  quietly.
- R-B works but is LARGER than R-A (manifest + lockfile vs lockfile
  only) and adds permanent pin-maintenance burden: future `shadcn`
  bumps may conflict with the pin, requiring revisits per v6 §07.9.
  Per v6 §07 dependency rule step 8, pinning is considered ONLY after
  the smallest compatible change — i.e. R-A first, R-B as fallback if
  R-A cannot hold.

T33-M's open question — "is `brace-expansion@5.0.12` alone sufficient?"
— is answered NO for full-green: it closes the 2 HIGHs + 1 brace
moderate but leaves the fast-uri + 2× ip-address moderates, and
`pnpm audit --prod` (no `--audit-level`) exits 1 on ANY finding while
the Security Audit job (`--audit-level=high`) would go green. Full
`web`-gate green requires all three bumps. This report therefore
authorizes the three-snapshot refresh, not a brace-only fix.

---

## 7. Selected remediation + policy compliance

**SELECTED: R-A — transitive-only refresh to
`brace-expansion@5.0.12` + `fast-uri@3.1.8` + `ip-address@10.7.1`.**

Why it is the smallest policy-compliant choice:

1. **v6 §07 dependency rule** prescribes exactly this order: inspect
   lock → identify resolved versions → smallest compatible change →
   narrowest test → workspace validation → pinning ONLY afterwards
   (step 8). R-A is steps 1–7; R-B jumps to step 8 without need.
2. **v6 §01 ADR triggers** (`dependency strategy` change) do NOT fire:
   no manifest range widened, no declaration moved across
   dep/devDep boundary, no strategy pinned — a patch-line
   re-resolution inside already-declared `^` ranges. R-D (devDeps
   move) and R-B (permanent override policy) ARE strategy-level and
   would need ADR/owner handling; R-A avoids both.
3. **Preservation policy (§04 + §09):** zero Handy/Rust/STT/catalog
   files touched; zero test files touched; zero workflow edits; zero
   runtime behavior change (CLI-only bytes, §5). The restoration
   budget separation (T33-M §14) is honored — this rides on no
   unrelated task.
4. **Prohibitions honored:** no audit disable, no level lowering, no
   allowlist, no suppression without reachability proof, no shadcn
   replacement, no broad upgrade, no unnecessary lockfile regeneration
   (3 snapshot blocks, §8), no Rust/Handy/STT/catalog/test changes.
5. **Completeness:** closes ALL HIGHs (the gating set for the Security
   Audit job) AND all MODERATEs (required for the `web` job's bare
   `pnpm audit --prod`), where safely possible — all three bumps are
   patch-line, parent-range-compatible, same-maintainer-line fixes.

Owner-decision rule check: R-A affects NO product behavior (CLI-only
patch guards, proven unimported), NO licensing (same packages,
patch-line; license fields re-verified post-install in §10), NO
security policy (strengthens it), NO architecture/boundary, NO
credentials/secrets, NO deliberate policy exception, NO ADR gate.
→ Routine implementation; the owner is NOT asked to choose between
R-A and R-B.

---

## 8. Exact file diff scope (authorized)

- `pnpm-lock.yaml` — exactly 3 snapshot bumps + integrity hashes:
  `brace-expansion@5.0.9 → 5.0.12`, `fast-uri@3.1.7 → 3.1.8`,
  `ip-address@10.7.0 → 10.7.1` (10.7.2 exists but 10.7.1 is the
  minimal fix; no reason to overshoot). No other snapshot, manifest
  range, or workspace declaration changes. Any wider diff on
  implementation aborts the commit (STOP condition §11).
- `package.json` (root/apps) — UNCHANGED (no overrides key under R-A).
- Source, tests, workflows, config, Rust/Handy/STT/catalog — UNCHANGED.
- This report + `PROGRESS.md` T33-N entry — documentation only.

---

## 9. Security / audit reasoning

- The gate is truthful: `pnpm audit` joins the frozen lockfile against
  the live advisory feed, so identical bytes newly fail when advisories
  publish (proven SUCCESS→FAILURE flip on the identical lockfile,
  §2). The fix changes the BYTES (re-resolution), not the gate.
- No advisory is suppressed, allowlisted, or downgraded. Reachability
  analysis (§5) is recorded to calibrate SEVERITY (CI-gating HIGH vs
  runtime LOW/NONE), never to justify suppression — governance
  prohibits suppression without proof of unreachability AND policy
  permission, and neither is invoked here since the bytes are fixed.
- The three fixes are same-line DoS-hardening patches (recursion
  guards, expansion caps, normalization/subnet/parsing bounds) with no
  documented API change; behavior risk is LOW and confined to
  pathological-input handling in CLI-only code paths (the INTENDED
  fix). `shadcn` codegen over Soravo's own component globs must be
  re-run + diffed to prove neutrality (§10).
- Supply-chain hygiene: fixed versions areatchronologically AFTER the
  vulnerable resolutions (brace fixes 2026-09-14 vs `5.0.9` of
  2026-07-30, per T33-M registry timing); integrity hashes are
  re-pinned by the package manager, not hand-edited; `shadcn` itself
  stays at its current latest (`4.21.0`) — no new upstream accepted
  blindly.

---

## 10. Test plan (must all pass before commit/push)

1. `pnpm install --frozen-lockfile` (pre-change sanity) — passes today
   (lockfile in sync).
2. Apply R-A refresh; `git diff --stat` shows ONLY `pnpm-lock.yaml`;
   `git diff pnpm-lock.yaml` shows ONLY the 3 snapshot bumps.
3. `pnpm why brace-expansion|fast-uri|ip-address` → ONLY the fixed
   versions, still under the same `shadcn` parents.
4. `pnpm install --frozen-lockfile` (post-change) — exit 0.
5. `pnpm audit --prod` — exit 0, 0 vulnerabilities (web-gate proof).
6. `pnpm audit --prod --audit-level=high` — exit 0 (Security-Audit proof).
7. Web gate parity (exact CI `web`-job order):
   `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build`.
8. `shadcn --help` smoke + any repo `shadcn add/diff` dry-run showing
   zero template drift (behavior-neutrality proof for the glob-path
   fix).
9. Commit FOCUSED (lockfile + report + PROGRESS.md only) → push →
   observe CI `web` + Security Audit green on the same advisory feed →
   record run IDs. NEVER claim CI success unless verified from GitHub
   (this report claims local + forensic proof only).

---

## 11. Explicit STOP conditions

STOP (no commit/push, escalate) if ANY holds:

1. Post-refresh `pnpm audit --prod` still reports ANY finding.
2. Lockfile diff touches ANY snapshot beyond the 3 authorized (broad
   re-resolution / registry drift) — abort, re-scope, do not commit
   churn.
3. Any `package.json` manifest change proves necessary (parent range
   conflict) — R-A has failed; R-B/R-D need fresh authorization analysis
   (R-D additionally needs an ADR).
4. `lint`/`typecheck`/`test`/`build` regress vs the pre-change baseline
   (all currently pass per the failing CI run's own log).
5. `shadcn` smoke/dry-run shows template drift (behavior change).
6. A NEW advisory publishes mid-task changing the finding set — re-audit,
   do not quietly extend scope.
7. Any step demands touching Rust/Handy/STT/catalog, tests, workflows,
   or secrets.

---

## 12. Implementation authorization

**AUTHORIZED:** R-A transitive-only refresh + §10 verification suite +
focused commit/push + CI observation, under §8 scope and §11 stops.
No owner decision. No ADR. No merge (PR #63 merge remains a human
decision; 0/1 review still outstanding).

**NOT authorized:** R-B/R-C/R-D/R-E in any form; any source, test,
workflow, config, Rust/Handy/STT/catalog, or secret change; any broad
upgrade; any suppression.

---

## 13. Post-push verification (2026-09-30, follow-up)

**Commit:** `0913e7c54d935afa411deb281fca75a2c240245e`
(`fix(web): refresh transitive audit findings to fixed versions (T33-N)`).
**Files:** `pnpm-lock.yaml` (26 diff lines: 3 version+integrity bumps +
4 parent refs + 3 snapshot headers) + this report (new) + `PROGRESS.md`
entry. No manifest, source, test, workflow, config, or secret change.
No `pnpm.overrides` added — override determined NOT the minimum:
transitive-only refresh is smaller (lockfile only, no permanent pin
burden) and fully deterministic under `--frozen-lockfile`; v6 §07
prescribes smallest-compatible first, pinning only afterwards.

**Scope note vs brace-only scoping:** the remediation covers all three
vulnerable transitives (`brace-expansion` 5.0.9→5.0.12,
`fast-uri` 3.1.7→3.1.8, `ip-address` 10.7.0→10.7.1), not brace alone.
Rationale: CI `web` runs bare `pnpm audit --prod` (ci.yml:26), which
exits 1 on ANY finding — the 3 moderate rows fail the SAME step as the
2 HIGHs and share the SAME `shadcn@4.21.0`-rooted production path
family, so they are related, not unrelated. A brace-only fix would
leave `web` red. All three bumps are patch-line, within existing
parent ranges (`minimatch ^5.0.8`, `ajv ^3.0.1`,
`express-rate-limit ^10.2.0`, `socks ^10.1.1`), with zero parent,
manifest, or unrelated-package change.

**Local validation (current HEAD, `pnpm@11.17.0`, node 22):**
`pnpm install --frozen-lockfile` exit 0 · `pnpm audit --prod` exit 0
("No known vulnerabilities found") · `--audit-level=high` exit 0 ·
`pnpm why` shows ONLY `brace-expansion@5.0.12` / `fast-uri@3.1.8` /
`ip-address@10.7.1` (single versions, same `shadcn` parents) ·
`pnpm lint` / `typecheck` / `test` / `build` all exit 0 ·
`shadcn --help` smoke passes via local `pnpm --filter` exec ·
`git diff --check` clean · no `package.json`/workspace/workflow delta.

**GitHub CI (verified from run logs, never claimed from local runs):**
- CI `36672260194` (head `0913e7c5`) — `completed` / `success`
  (`https://github.com/eySRbS4zgHuW3gMFZB2/soravo/actions/runs/36672260194`);
  `--log-failed` empty — `web` (incl. `pnpm audit --prod`) green.
- Security Audit `36672260245` — `completed` / `success` (43 s).
- PR #63 OPEN, `mergeStateStatus: BLOCKED` only on the outstanding
  0/1 review; NOT merged (merge is a human decision).

**Remaining unrelated failures:** none in the `web` / Security Audit
gates for this remediation. Sibling `rust`/`e2e`/`desktop` outcomes are
covered by the CI run record above; no unrelated failure was fixed or
masked in this task.

**STOP. T33-N complete. Do not begin T33-O.**
