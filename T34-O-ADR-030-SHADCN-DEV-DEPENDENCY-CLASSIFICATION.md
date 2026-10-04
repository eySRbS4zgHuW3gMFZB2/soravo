# ADR-030 — `shadcn` is build/development tooling for the website (dev-only classification ratified)

Status: **ACCEPTED (owner-directed).**
Date: 2026-10-04 (UTC). Task: T34-O. Branch: `fix/t34-l-braces-dependency-remediation`.

## Authorization

Explicit owner instruction in T34-O, verbatim: **"The T34-L shadcn dependency
reclassification is ACCEPTED. Keep it exactly as implemented. Do not redesign
it, replace it, or introduce another dependency strategy."** The same
instruction sets the residual-posture decision: the remaining `braces` HIGH
**"is ACCEPTED as a documented DEVELOPMENT-ONLY supply-chain risk"** because it
is absent from the production graph, survives only through `shadcn`'s
development dependency chain, no valid upstream `braces` 3.0.4 exists, and
**"no fabricated workaround is permitted"**.

This ADR is the ratification record for a remediation that was **applied
first** (T34-L) and **narrowed** (T34-N) before it was authorized. T34-E and
T34-I classified the reclassification as owner/ADR-gated and T34-K listed it
as an open owner decision; T34-L applied it with no ADR and no recorded owner
approval. That ratification gap is what this ADR closes. It authorizes
nothing new and changes no file.

## Decision

`shadcn` is **build/development tooling for the website**. It is **not** a
production runtime dependency, and the **desktop application does not require
it at runtime**. Its classification as dev-only is therefore intentional and
correct, not an audit convenience.

Concretely, the ratified state is:

1. `apps/website/package.json` — `shadcn` in `devDependencies`.
2. `apps/desktop/package.json` — `shadcn` **not declared at all**.
3. `pnpm-lock.yaml` — the surgically restored T34-N lockfile, retained as-is.

## Why dev-only is the correct classification (source evidence)

Verified first-hand on this branch at `4395e725`, not inherited from T34-M:

- **Zero runtime imports of the `shadcn` package anywhere.** A scan of every
  `.ts`/`.tsx`/`.js`/`.jsx` file under `apps/`, `packages/`, `services/` and
  `supabase/` for `from "shadcn"`, `require("shadcn")` and
  `import("shadcn")` returns **0 matches**.
- **Exactly one consumption, and it is build-time.**
  `apps/website/src/styles.css:3` is `@import "shadcn/tailwind.css";`, resolved
  by Vite during `vite build`. That is a build step, not a runtime path.
- **Desktop has no shadcn usage whatsoever.** A case-insensitive scan of
  `apps/desktop/src` and `apps/desktop/index.html` returns **0 matches** — no
  JavaScript import and no CSS import. `button.tsx`/`card.tsx` are local
  project source files that the shadcn CLI copies into the tree; they are not
  the npm package. Removing the declaration from the desktop manifest
  therefore removes an unused edge and changes no desktop behaviour.
- **`shadcn` is a CLI.** The registry publishes
  `shadcn@4.21.0` with `bin: { "shadcn": "dist/index.js" }`. It is a
  component-generation command-line tool plus a theme-CSS provider.
- **The build still resolves it as a devDependency.** `pnpm install`
  installs devDependencies, so `@import "shadcn/tailwind.css"` resolves
  through the package `exports` subpath. Proven on the built artifact:
  `apps/website/dist/assets/index-*.css` carries the inlined shadcn
  `base-nova` tokens (`--primary:oklch(28.6% .053 162.6)`, dark
  `--primary:oklch(69.7% .035 155.6)`).

`components.json` is **retained in both workspaces.** It is CLI configuration
for future component generation, not a runtime dependency edge, and removing
it would change the classification question rather than answer it.

## Resulting dependency graph

- **Production graph excludes `braces`.** `pnpm audit --prod` reports
  **`No known vulnerabilities found`** (exit 0). The desktop no longer
  declares `shadcn`, and the website declares it only in `devDependencies`.
- **Development graph still contains `braces@3.0.3`,** reachable by exactly
  one path. `pnpm why braces -r` reports `Found 1 version of braces`:

  ```
  braces@3.0.3
  └─┬ micromatch@4.0.8
    └─┬ fast-glob@3.3.3
      ├─┬ @ts-morph/common@0.27.0
      │ └─┬ ts-morph@26.0.0
      │   └─┬ shadcn@4.21.0
      │     └── @soravo/website@0.1.0 (devDependencies)
      └── shadcn@4.21.0 [deduped]
  ```

  The path terminates at a **devDependency**. No production importer reaches
  `braces`.
- Neither shipped artifact references the toolchain: `apps/website/dist` and
  `apps/desktop/dist` contain **no occurrence** of `braces`, `micromatch`,
  `fast-glob` or `shadcn`.

## Accepted residual risk: development-only `braces` HIGH

- **Advisory:** `GHSA-vfj7-8cjw-p6xm` — stack-exhaustion denial of service
  through deeply nested patterns. Severity **HIGH**. Vulnerable `<=3.0.3`;
  patched `>=3.0.4`.
- **No patched release exists.** Verified live against the registry:
  `npm view braces dist-tags` → `{ latest: '3.0.3' }`; the complete 3.x
  version list is `3.0.0, 3.0.1, 3.0.2, 3.0.3`; `npm view braces@3.0.4`
  returns **`npm error 404`**. The remediation target does not exist.
- **Upgrading the parent provides no remediation.** `shadcn@4.21.1` (current
  `latest`) still declares `fast-glob: ^3.3.3` and `ts-morph: ^26.0.0`, so the
  `braces` path is unchanged at the newest published version.
- **Scope of the residual.** It is reachable only from a build-time/CLI tool
  in the development graph. It is absent from the production graph, absent
  from both shipped artifacts, and unchanged in count, severity and paths
  from the pre-T34-N state.
- **Disposition: ACCEPTED and documented** by owner decision in T34-O.

## What this ADR explicitly does NOT do

No audit weakening of any kind was used, and none is authorized:

- **No audit suppression.** No `overrides`, `resolutions`,
  `patchedDependencies`, `auditConfig`, `ignoreCves` or `ignoreGhsas` key
  exists in the root, `apps/website`, `apps/desktop`,
  `packages/payment-domain` or `services/license-api` manifests, nor in
  `pnpm-workspace.yaml`.
- **No `.npmrc`.** The file does not exist in the repository.
- **No CI weakening.** `ci.yml` (`pnpm audit --prod`) and
  `security-audit.yml` (`pnpm audit --prod --audit-level=high`) are untouched
  by this ADR and by the T34-L/T34-N dependency change.
- **No fabricated package version, mirror, hash or download URL.** Every
  integrity hash in the retained lockfile was re-verified byte-for-byte
  against the live registry (`shadcn@4.21.0`, `vite@8.3.1`, `vitest@5.0.2`,
  `typescript-eslint@8.70.1`, `why-is-node-running@3.2.2`,
  `@tauri-apps/api@2.12.0`, `@tauri-apps/cli@2.12.0`, `braces@3.0.3`) — all
  **MATCH**. `pnpm install --frozen-lockfile` exits 0 and leaves the lockfile
  byte-identical (sha256 `585970ceb6475686b3fa2722e6083bb9c8443172fcc6ba948968ee97b0dc18a1`).
- **No version pinning, and no dependency-strategy change.** The floating
  `"latest"` dist-tag specifiers are untouched — see *Deferred* below.
- **No Tauri, Vite, Vitest, TypeScript-ESLint, Wrangler or Rust change.**
- **No Handy desktop behaviour change.** No Handy-derived file, the Handy pin
  `ba10ce19`, `Cargo.toml` or `Cargo.lock` was touched by T34-L, T34-N or this
  ADR.

## Lockfile retention

The `pnpm-lock.yaml` is retained **exactly** as T34-N restored it: the
pre-T34-L resolutions, plus the six-line `shadcn` importer relocation. The
complete T34-L/T34-N dependency delta against the pre-remediation tree
`02b14773` is **12 changed lines total (4 insertions, 8 deletions), every one
of them belonging to `shadcn`** — two manifest
lines moved and one added, and the three-line lockfile importer entry deleted
from `apps/desktop` `dependencies`, deleted from `apps/website`
`dependencies`, and added to `apps/website` `devDependencies`. Filtering all
added/removed lines for `tauri-apps|vite|vitest|typescript-eslint|why-is-node-running|undici|wrangler|miniflare`
returns **zero hits**. Restoring the lockfile this way is what keeps
unrelated package movement out of a security-remediation change; the pinned
result is `@tauri-apps/api` **2.12.0**, `vite` **8.3.1**, `vitest` **5.0.2**,
`typescript-eslint` **8.70.1** (the duplicate 8.71.0 subtree is gone),
`why-is-node-running` **3.2.2**, `@tauri-apps/cli` **2.12.0** — each present
as exactly **one** version in the installed graph.

## Consequences

- `pnpm audit --prod` = 0 vulnerabilities, locally and in CI. The
  production-graph blocker that motivated this remediation is closed.
- `pnpm audit --audit-level=high` (full graph, dev included) = **11
  vulnerabilities, 3 low / 5 moderate / 3 high**. The three HIGHs are
  `braces` ×1 (dev-only, accepted above) and `undici` ×2 via
  `wrangler > miniflare`. The `undici` findings are **pre-existing and
  byte-identical** to the pre-T34-L lockfile (`undici@7.29.0`, `7.29.1`,
  `8.10.2` in both), are outside PR #64's scope, and remain untouched.
- The dev-graph advisory stays **visible and un-suppressed**. If `braces`
  publishes `>=3.0.4`, or `shadcn` drops the `fast-glob`/`micromatch` chain,
  this ADR's premise changes and the posture must be revisited.
- This ADR is governance closure only. It does not make the project
  production-ready, does not authorize a merge, and closes no release gate.

## Deferred — separate ADR/task, deliberately not decided here

The root cause of the lockfile-churn **class** is a floating-`"latest"`
dependency-strategy problem, not a `braces` problem. `vite`, `vitest`,
`typescript-eslint`, `@tauri-apps/api` and `@tauri-apps/cli` remain declared
as the `"latest"` dist-tag in `apps/*` and `services/*`, so the **next**
non-frozen `pnpm install` on any workspace will re-introduce exactly the
unrelated movement T34-N had to isolate. Replacing `"latest"` with pinned or
caret ranges is a **dependency-strategy change requiring its own ADR and owner
approval**. It is explicitly **not** decided by this ADR and was not touched
by T34-O.

ADR-027 (Handy transcription semantics #2156/#2157) and ADR-028 (Chinese-script
selector #2186) remain **PROPOSED (NOT ACCEPTED)** and untouched.
