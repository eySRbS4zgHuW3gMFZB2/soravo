# OpenCode Takeover Report

Date: 2026-09-14
Agent: OpenCode (primary sole engineering agent), resuming work started by a previous Codex-era agent.

## A. Repository state

- Real, writable Git repository (`.git` present and functional).
- Remote: `origin` → `https://github.com/eySRbS4zgHuW3gMFZB2/soravo.git`.
- GitHub CLI authenticated as `eySRbS4zgHuW3gMFZB2` (scopes: `gist`, `read:org`, `repo`, `workflow`).
- Single commit exists from the previous agent (see D). No other history.

## B. Current branch

`main`, tracking `origin/main`. Push target per session policy is `origin/main`.

## C. Remote

`origin` = `https://github.com/eySRbS4zgHuW3gMFZB2/soravo.git` (HTTPS).

## D. Latest commit

`739ea66 chore: establish Soravo foundation` (2026-09-14). This and only this commit existed at takeover.

## E. Working tree state

Clean at takeover start. The previous session's audit (`progress/FOUNDATION_AUDIT.md`) described an environment where `.git` was a read-only tmpfs, DNS was blocked, GitHub CLI was unauthenticated, and Linux Tauri libraries were missing. That environment state is obsolete: all of those conditions are now resolved in this environment (real Git, working DNS, valid `gh` auth, native libraries installed).

## F. Completed specification tasks

| Task | Status | Evidence |
| --- | --- | --- |
| FOUNDATION-001 repository/bootstrap | DONE | Real Git repo, remote, initial commit, workspace manifests, apps, Cargo workspace, committed lockfiles, `.gitignore`. |
| FOUNDATION-002 engineering docs + ADR structure | DONE | All 14 numbered docs + `README.md` + `SPEC_MANIFEST.json`; `decisions/README.md` + `ADR-001`; `docs/ARCHITECTURE.md`. |
| FOUNDATION-003 CI and code quality | DONE (this session) | CI runs web lint/typecheck/test/build/audit and Rust fmt/clippy/test; Rust job now installs Tauri Linux system deps (was missing and would fail on GH Actions). All gates green locally. |
| FOUNDATION-004 environment audit | DONE | `progress/ENVIRONMENT.md` recorded; live-verified this session (Node 22.23.1, pnpm 11.17.0, rustc/cargo 1.97.1, git 2.43.0, gh 2.100.0, Tauri CLI 2.11.4, Tauri native libs present). |
| Foundation Gate validation | GREEN | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod` (no known vulns), `cargo fmt --check`, `cargo check --workspace`, `cargo test --workspace`, `cargo clippy --workspace --all-targets --all-features -- -D warnings` — all PASS. |

## G. Partially completed tasks

- FOUNDATION-005 skills.sh setup: policy recorded in `progress/SKILLS.md`; skills not installed. Install decisions deferred per trust policy.
- FOUNDATION-006 MCP setup: policy recorded in `progress/MCP.md`; no MCP server configured. Human-gated (credentials/projects).
- FOUNDATION-007 TestSprite MCP: FAIL / not configured. Human-gated (dedicated account/project).
- FOUNDATION-008 checkpoint/progress automation: required files exist and are updated manually; no automation script yet.
- WEB-002 shadcn design system: `components.json` configured (base-nova style) and official `button` component now generated in `apps/website` (`src/components/ui/button.tsx`) with `@base-ui/react` dependency added. Design-system CSS tokens not yet migrated into `styles.css`.
- Frontend scaffold: both apps build/test/lint/typecheck.

## H. Unstarted tasks

- Every task after Phase 0 (Phases 1–15): website pages/routing, auth/account/backend, desktop features, audio, STT, transcript, hotkey/pill, typing, models, settings/history/vocabulary, payments, release, security hardening, performance, RC.
- Most crate implementations: `crates/{audio,vad,scheduler,typing,hotkeys,models,history,diagnostics,licensing,stt}` are `.gitkeep` placeholders only.
- `services/license-api` and `supabase` are documented boundaries (`README.md` only).
- No integration/E2E/performance/security tests exist yet (`tests/*` are empty scaffolds).

## I. Existing implementation

- `apps/website`: single-anchor-page landing (hero, features, privacy, pricing, FAQ, download, legal links) in `src/website.tsx`; handwritten CSS; Vite + React 19 + TS6 + Tailwind v4 (via `@tailwindcss/vite`).
- `apps/desktop`: React shell (`src/app.tsx`) + Tauri v2 Rust runtime (`src-tauri/`) exposing a single `runtime_status` command; minimal capability set (`core:default`); handwritten CSS.
- `crates/config`: `InteractionMode` + `Shortcut` validated value objects (no persistence).
- `crates/transcript`: `SessionId`, `TranscriptKind`, `TranscriptUpdate`, `TranscriptOrder` (stale/duplicate rejection). Works with TDD §10 boundary; never types text.
- `.github/workflows/ci.yml`: web + rust jobs.
- `decisions/ADR-001`: Tauri v2 architecture.

## J. Known bugs

- None outstanding. The one previous build breaker — missing Tauri icon assets (`apps/desktop/src-tauri/icons/*`), which made `cargo check`/`tauri build` fail — was fixed this session by generating the standard icon set from a placeholder source image. The icon is a placeholder and must be replaced with final brand assets before release.

## K. Known environment blockers

- TestSprite: not configured; requires a dedicated non-production account/project and approved MCP credentials.
- Supabase: no project; requires owner to provide a development project + credentials via the approved secret mechanism (Phase 2).
- Cloudflare: no account/project; required for website deployment (Phase 1/website hosting).
- Signing/notarization credentials for release binaries (Phase 12).
- Linux is development-only; macOS/Windows are the V1 targets.

## L. Security concerns

- No secrets in the repository (verified by prior audit and re-verified; no `.env`/PEM/key files tracked).
- Desktop capability file grants only `core:default`; Rust crates forbid `unsafe_code`; CSP tightened with `base-uri`/`form-action`/`frame-ancestors`/`object-src`.
- Open items (deferred, recorded): CSP retains `style-src 'unsafe-inline'` (verify/remove for production), `latest` dependency ranges in app manifests (pin before release), CI has no secret scan job, MCP not yet configured, no backend/data paths exist yet to review.
- `pnpm audit --prod`: no known vulnerabilities.

## M. Testing status

- PASS: `pnpm lint`, `pnpm typecheck`, `pnpm test` (website 1, desktop 1), `pnpm build`, `pnpm audit --prod`.
- PASS: `cargo fmt --all -- --check`, `cargo check --workspace`, `cargo test --workspace` (config 2, transcript 1, desktop lib 0 runtime), `cargo clippy --workspace --all-targets --all-features -- -D warnings`.
- NOT YET PRESENT: integration, E2E, performance, security suites (directories scaffolded only).

## N. MCP status

Unconfigured. See `progress/MCP.md`. GitHub/Supabase/Cloudflare/TestSprite MCPs are not wired; GitHub auth is valid via CLI. MCP is development tooling only, never part of the desktop runtime.

## O. Skills status

No external skills installed. `progress/SKILLS.md` classifies each registry skill; bundled Supabase plugin skills are available for Phase 2. Trust policy: inspect source + SKILL.md, record version/commands/credentials, prefer official sources before any install.

## P. Foundation Gate verdict and exact next task

Foundation Gate: **GREEN**. All code-level validations pass; leftover foundation items (skills/MCP/TestSprite/automation) are either human-gated or non-blocking for Phase 1 coding.

Exact next task: **Phase 1 — Website foundation**, starting with **WEB-001 site shell** (React Router routing, page layout/shell for the required page set) and then **WEB-002 shadcn design system** (theme tokens + component primitives). The previously generated `button` component and `@base-ui/react` dependency bootstrap WEB-002.

## Q. Files changed this session (pending commit)

- `.github/workflows/ci.yml` — install Tauri Linux deps in rust job; add `pnpm audit --prod` step.
- `.gitignore` — ignore `apps/desktop/src-tauri/gen/` (build artifact).
- `apps/desktop/src-tauri/icons/*` — generated desktop icon set.
- `apps/website/src/components/ui/button.tsx` — official shadcn (base-nova) component.
- `apps/website/package.json` + `pnpm-lock.yaml` — add `@base-ui/react`.
- `progress/OPENCODE_TAKEOVER.md` (this report), `progress/STATUS.md`, `progress/NEXT.md` updated.
## R. Post-takeover session 2 — WEB-001/WEB-002 (committed with this change set)

- Committed and pushed: `dbb03c5` "chore: remediate foundation gate and open Phase 1" (sections Q above, CI/icon/gitignore/button/progress).
- Installed website deps: `react-router`, `@testing-library/react`, `@testing-library/jest-dom` (base-ui already in dbb03c5).
- Added shadcn `card` primitive (`apps/website/src/components/ui/card.tsx`, base-nova).
- Prepended shadcn base-nova theme tokens to `apps/website/src/styles.css`: `@import "shadcn/tailwind.css"`, `@custom-variant dark`, `@theme inline` + `:root` light tokens and `.dark` dark tokens for the full Soravo palette (oklch), `@layer base`; all hand-written site CSS preserved below verbatim.
- Replaced single-anchor `website.tsx` with routed site: `app.tsx` (BrowserRouter + exported `AppRoutes` for tests), `components/layout/{layout,site-header,site-footer}.tsx` (scroll-restore, sticky-less header with mobile menu, legal/account footer), `components/page-intro.tsx`, and 13 pages: landing (ported), features, pricing, download, faq, support, privacy, terms, refund, login, account, admin, not-found. `main.tsx` now renders `<App/>`.
- Vitest: jsdom config in `apps/website/vite.config.ts`; `test-setup.ts` stubs `scrollTo`; `website.test.tsx` renders through `MemoryRouter` + `AppRoutes` (3 tests: landing promise, privacy page, 404).
- Gates after this session: `pnpm lint`, `pnpm typecheck`, `pnpm test` (website 3, desktop 1), `pnpm build`, `pnpm audit --prod` ALL PASS.
- Next task: WEB-003 content/design refinement (see `progress/NEXT.md`).

## S. Post-takeover session 3 — WEB-003 landing/features (committed with this change set)

- Landing copy rewritten around PRD positioning: hero lede uses the core promise (fast/accurate/local/private/instantaneous); features reframed to "Private by default / Feels instantaneous / Delivers finished words"; new "Focused, by design" scope section (not-list per PRD §1); FAQ swaps platforms Q for benchmark-driven engine Q; pricing copy notes ~$12/mo + ~$50 lifetime only as evaluated targets, no live prices advertised.
- Features page expanded: capabilities block renders 6 PRD-grounded capabilities in shadcn Cards (hotkey recorder, warm capture/pre-roll, local recognition, tentative-vs-final injection, clipboard fallback/restore, verified atomic model installs); personas section (lawyers/executives/consultants/writers); Button CTA to /download with text-link to /faq.
- Accessibility: CardTitle given role heading aria-level 2 on features; page h1/h2 hierarchy intact; NavLink aria-current inherited from react-router.
- CSS additions: `.scope-list`, `.persona-grid`, `.persona`, `.page-actions`; responsive collapse for persona grid. Bespoke landing identity CSS preserved.
- Tests: landing scope assertion + features capability-card assertion added (5 website tests total); updated landing privacy-promise matcher to "privacy commitment".
- Gates after this session: `pnpm lint`, `pnpm typecheck`, `pnpm test` (website 5, desktop 1), `pnpm build`, `pnpm audit --prod` ALL PASS.
- Next task: WEB-004 pricing/download/FAQ (see `progress/NEXT.md`).

## T. Post-takeover session 4 — WEB-004 pricing/download/FAQ (committed with this change set)

- Pricing page rebuilt: shadcn Card grid of two plans (Monthly ≈$12, One-time ≈$50), each kicker-labeled
  "EVALUATED TARGET" plus a disclaimer that targets are not an offer and nothing is billed today (PRD §8
  compliance). CTAs: launch list + refund policy link. MDN-style color fixes so prices render in ink ink, not sage.
- Download page: staged matrix as Cards (macOS / Windows) with system requirements, artifact type, "No build
  yet" disabled Buttons, signed+SHA-256 checksum verification note, and explicit "Linux is deferred" line.
- FAQ expanded 5→10 items (engine selection, automatic typing/injection, network boundary, expected cost,
  download verification) with a support CTA; uses native details/summary styled via `.page details`.
- CSS: added `.plan-kicker`, `.plan-price`, `.plan-terms`, `.plan-list`, `.plan-disclaimer`, `.verification-note`;
  removed dead `.plan-card`/`.card-footer-button` attempt.
- Tests: 3 new assertions (evaluated-target labels + nothing-billed disclaimer, staged download cards +
  checksum note, FAQ cost/verification Q&A). Website suite now 8 tests.
- Gates after this session: `pnpm lint`, `pnpm typecheck`, `pnpm test` (website 8, desktop 1), `pnpm build`,
  `pnpm audit --prod` ALL PASS.
- Next task: WEB-005 legal/support pages (see `progress/NEXT.md`).
