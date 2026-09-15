# Status

Current phase: Phase 2 — Auth/account/backend
Current task: CLOUD-008 session/password flows — IMPLEMENTED (auth-service scoped signOut + reauthentication flow; account page local-signout, other-sessions button, code-entry for password change; mock/test updates; ADR-023; PR #8 pending open on `feature/cloud-008-session-password`, no merge)
Branch: feature/cloud-008-session-password (stacked on `feature/cloud-006-admin-authorization`)
Skills selected/loaded (Skill Selection Gate, 2026-09-15): loaded `supabase`, `supabase-postgres-best-practices`, `security-guidance`, `securability-engineering`, `vitest`, `gh-cli`, `github`; plus `frontend-accessibility`/`react` loaded this session (CLOUD-008 touches website React/TypeScript auth flows). Skips recorded and unchanged: `semgrep`/`codeql` (CLI unavailable on host — substituted by structural migration-guard invariants, DB/RLS assertion suites, manual review).
Last commit: `6315d09` (PR #7 merge commit into `feature/cloud-006-admin-authorization`) then session work (auth-service, auth-context, account, mock, tests, ADR-023, STATUS/NEXT) on `feature/cloud-008-session-password` — pending push and PR open.
Repo-gate chain green: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` (website 84 + desktop 1 + supabase guard 12) ✓, `pnpm build` ✓, `pnpm audit --prod` ✓ (no known vulnerabilities), `cargo fmt --check` ✓, `cargo check --workspace` ✓. Rust untouched by this task.
Current implementation state: CLOUD-001/002/003/004/005/006/007 live on dev project `zbzhlhoxblguepplqppw` (PR #7 already merged into `feature/cloud-006-admin-authorization`). CLOUD-008 is website-client-only (no new SQL migration):
- `auth-service.ts`: `signOut` is now scope-explicit, defaulting to `"local"` (fixes the global-scope sign-out bug from CLOUD-002); `updatePassword` detects `reauthentication_needed` and returns `reauthRequired: true`; `requestReauthentication` sends the OTP via GoTrue; optional `nonce` on `updatePassword` finalizes the change; all new failure paths collapse to generic enumeration-safe messages.
- `auth-context.tsx`: `signOut` now takes an optional `{ scope }` param; `updatePassword` returns the widened `UpdatePasswordResult` type; `requestReauthentication` exposed.
- `account.tsx`: "Sign out" uses `scope: "local"`; new "Sign out other sessions" uses `scope: "others"` and shows a success message; password change enters a code-entry reauth form when needed (auto-sends OTP, accepts nonce).
- `reset-password.tsx`: stale reauth challenge routes the user back to a fresh reset link.
- `supabase-mock.ts`: `reauthenticate` method added; `signOut` captures and validates scope (`others` suppresses SIGNED_OUT event); `updateUserError` now carries optional `code`.
- Tests: 84 website tests + 1 desktop test + 12 migration-guard tests all pass; new tests cover scoped signOut forwarding, default-local behavior, reauthRequired detection, code-entry flow, other-sessions success, stale-link redirect.
- ADR-023 (`decisions/ADR-023-scoped-signout-and-password-reauthentication.md`) records the decision; `10_ADR_INDEX.md` updated.
Known failures: None.
Verification: No DB changes — no Supabase MCP / `db_assertions` / `rls_assertions` re-run needed this task. Repo gates + assertions recorded above. Advisors unchanged.
Security status: scoped `signOut` correctly terminates only the target scope server-side via GoTrue (local = current, others = all others); no new SECURITY DEFINER, no new migration, no new privileged surface. check-16 whitelist remains exactly 3 functions. Enumeration resistance preserved on all new auth paths; no secret/token/session disclosure vectors. No audio/transcript/keystroke/clipboard/history in Supabase (unchanged).
TestSprite status: Not configured; requires dedicated account/project (human-gated). Not applicable to CLOUD-008.
Benchmark status: Not started; not applicable to CLOUD-008.
Next exact action: push `feature/cloud-008-session-password`, open CLOUD-008 PR (stacked, no merge), emit final STOP B report. After that PR is merged, proceed to the next cloud task per `05_TASK_BREAKDOWN.md`.

(Last updated 2026-09-15)
