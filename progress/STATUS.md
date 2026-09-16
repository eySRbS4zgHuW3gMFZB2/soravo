# Status

Current phase: Phase 2 — Auth/account/backend (frontend wire-up)
Current task: WEB-010 dashboard browser E2E (Playwright) — IMPLEMENTING
Branch: feature/web-010-dashboard-e2e
Parent: main at `1b80895` (WEB-009 merged via PR #13). Branch created from `origin/main` `1b80895`; clean tree.
Skills selected/loaded (Skill Selection Gate, WEB-010): loaded `playwright`, `security-guidance`, `frontend-accessibility`, `github`, `vitest`, `react`. Evaluated-not-loaded by prior sessions: `semgrep`/`codeql` CLI unavailable on host (substituted by structural invariants, migration-guard, DB/RLS assertion suites, and manual review); `shadcn`/`frontend-design`/`web-design-guidelines`/`supabase`/`securability-engineering`/`vercel-react-best-practices` not re-loaded (no UI/styling or Supabase-dashboard work in this task); `supabase-postgres-best-practices` not re-loaded (no DB changes in this task).
Repo-gate status: local gates pending on this branch (will run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, `pnpm e2e`); Rust untouched — no cargo gates required; migration-guard not re-run (no DB changes).
Implementation state (WEB-010):
- `apps/website/src/test-utils/e2e-fixtures.ts` (new): browser-safe, runtime-zero-import in-memory Supabase double (dev-only). Chainable Postgrest pipe (select/eq/maybeSingle/single/returns, insert/select/single/returns, update/eq, select/order/returns), auth emitter (getSession / onAuthStateChange / signInWithPassword / signUp / resetPasswordForEmail / signOut / updateUser / reauthenticate), and RPC router for the CLOUD-007 + CLOUD-013 admin functions. Scenarios: `anon` (inert; valid login `ada@example.com` / `correct-horse-battery`), `user` (role=user empty account), `admin` (role=admin, full metrics + 27-user 2-page directory). Type-only imports, so the module has no runtime deps and ships in no production bundle.
- `apps/website/src/test-utils/e2e-harness.tsx` (new): reads `?test-scenario=`, builds the scenario client, renders `<App client={client} />` under StrictMode.
- `apps/website/src/main.tsx`: dev-only boot gate — harness loads only when `import.meta.env.DEV && VITE_E2E_TEST_MODE === "true"` via dynamic import (dead-code eliminated in production); otherwise normal `<App />`.
- `apps/website/src/app.tsx`: optional `client` prop threaded `App → AppRoutes → AuthProvider`; production behavior unchanged (defaults to `getSupabaseClient()`).
- `apps/website/src/vite-env.d.ts`: `VITE_E2E_TEST_MODE` documented.
- `apps/website/.env.example`: `VITE_E2E_TEST_MODE` documented (dev-only, unset by default).
- `playwright.config.ts` (new, repo root): chromium-only, baseURL 127.0.0.1:4175, webServer boots Vite dev with `VITE_E2E_TEST_MODE=true --port 4175 --strictPort`, CI reporter + retries + artifacts.
- `tests/e2e/helpers.ts` + `tests/e2e/navigation.spec.ts` + `tests/e2e/auth.spec.ts` + `tests/e2e/admin.spec.ts` (new): public nav + 404, footer account link, skip-link/landmarks/a11y smoke, unauthenticated guards, sign-in success/failure, empty-state account, display-name + password flows, sign-out local, non-admin owner block, metrics aggregates, growth toggle, distributions + snapshot, directory page 1→2→pagination, search filter, no-match empty state, populated admin account.
- `package.json` (root): `@playwright/test ^1.63.0` devDep + `e2e` / `e2e:install` scripts; lockfile updated.
- `.github/workflows/ci.yml`: new `e2e` job (install frozen, `playwright install --with-deps chromium`, `pnpm e2e`, upload playwright-report artifact on failure).
Known failures: None.
Security status: harness is dev-only and production-dead-code-eliminated; no prod endpoint, no auth/RLS/authz changes, no service-role/anon keys, no secrets; server-side authorization remains verified by the Supabase rls_assertions/db_assertions + Vitest suites (documented limitation — browser E2E uses a test double, never weakens production code); generic-only error rendering asserted in the failure path; diff scanned for secrets.
Next exact action: run repo gates (`pnpm lint`/`typecheck`/`test`/`build`/`audit --prod` + `pnpm e2e` after `pnpm e2e:install`), fix any failures, then commit (`test: add dashboard browser E2E coverage (WEB-010)`), push `feature/web-010-dashboard-e2e`, open PR vs main, verify CI (web, e2e, rust) green, merge (explicitly authorized for this task), checkout/update `main`, verify clean tree + gates, then emit the `# WEB-010 FINAL REPORT` (incl. NEXT MILESTONE: website deployment / Razorpay verification preparation) and HARD STOP.
(Last updated 2026-09-16)

## Prior task record — CLOUD-001..013 / WEB-001..009

## Prior task record — CLOUD-001..013 / WEB-001..009

- CLOUD-013 admin user directory — MERGED via PR #12 (main `08c8280`): server-owned immutable `profiles.public_user_id` + SECURITY DEFINER `admin_users(p_search, p_offset)` RPC (ADR-025), applied to dev project `zbzhlhoxblguepplqppw`, 60 db-assertions + U1–U21/U21c rls-assertions green live, migration-guard 12/12. Unblocked this WEB-009 frontend task.
- WEB-009 admin dashboard — MERGED via PR #11 (main `6bf1a86`): owner gates, overview aggregates via the CLOUD-007 metrics RPCs, accessible zero-dep growth chart, subscription/lifetime distributions, generated-at snapshot, 123 website tests, and an honest "User directory — not yet available" note (backend was the PRD §7 gap that CLOUD-013 closed; the directory frontend wiring is this task).
- WEB-008 account dashboard — MERGED via PR #10: entitlements/devices/sessions reads via closed safe projections only, staged downloads, 104 website + 41 license-api + 12 migration-guard tests.
- CLOUD-001..009 — MERGED via PRs #2–#9: default-deny baseline, profiles/RLS, authorization hardening, entitlements, devices/sessions, admin role, product metrics (three SECURITY DEFINER RPCs), session/password flows, payment service skeleton. WEB-001..007 complete.

(Last updated 2026-09-16)