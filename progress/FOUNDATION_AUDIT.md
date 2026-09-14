# Foundation audit — 2026-09-14

## 1. Executive summary

**Result: NOT READY for Phase 1.** The workspace has a usable JavaScript scaffold and a minimal Tauri shell, but it does not satisfy the Foundation exit gate. The highest-priority blockers are: no writable Git repository, invalid GitHub CLI authentication, missing Linux Tauri development libraries, unavailable Cargo/npm DNS at audit time, absent TestSprite, and no generated official shadcn component because `ui.shadcn.com` DNS fails.

Safe corrections made during this audit: added non-functional TDD directory placeholders, an ADR template, a tighter desktop CSP, corrected the environment record, and configured Tailwind v4 plus shadcn's official Vite baseline in both apps. No Phase 1 feature work was started.

## 2. Repository structure

The root follows the TDD at a high level (`apps`, `crates`, `services`, `supabase`, `tests`, `docs`, `decisions`, `tasks`, `progress`, `scripts`, `.github`). `apps/website`, `apps/desktop`, `services/license-api`, `supabase`, and the listed crate/test directories now exist.

The only functional crates are `crates/config` and `crates/transcript`; the remaining crate directories are intentional empty placeholders, not implementations. There is no duplicated runtime abstraction and no unnecessary microservice. `services/license-api` is only a documented boundary, which is appropriate before Phase 11.

The implementation diverges from the frontend TDD: CSS is handwritten in `apps/website/src/styles.css` and `apps/desktop/src/styles.css`; Tailwind and shadcn/ui are not installed. The website is a single anchor-based page rather than the required routed public/account/legal pages. These are **MODIFY**, not a reason to delete the useful scaffold.

## 3. Foundation task audit

| Task | Result | Evidence / correction needed | Proof required |
| --- | --- | --- | --- |
| FOUNDATION-001 repository/bootstrap | PARTIAL | Workspace manifests, apps, Cargo workspace, and TDD placeholders exist. `.git` is a read-only tmpfs placeholder, therefore no repository, branch, commits, or remote exist. | `git status`, `git remote -v`, clean fresh-clone install/build |
| FOUNDATION-002 engineering docs and ADR structure | PARTIAL | Source specification exists; `decisions/README.md` and ADR-001 now exist. Required decisions are not yet applicable, but ADR ownership/status policy is incomplete. | ADR template review; material decision test when introduced |
| FOUNDATION-003 CI and code quality | PARTIAL | `.github/workflows/ci.yml` runs web lint/typecheck/test/build and Rust format/clippy/test. It lacks dependency/security scanning, integration/E2E/package validation, and cannot yet pass Rust on Linux. | Green CI from a real GitHub repository |
| FOUNDATION-004 environment audit | PARTIAL | `progress/ENVIRONMENT.md` now records versions and blockers. It originally overstated Tauri readiness; the native library/DNS/root constraints are now explicit. | `cargo check/test/clippy` after prerequisites are installed |
| FOUNDATION-005 skills.sh installation/registry | PARTIAL | `progress/SKILLS.md` now classifies every named skill. Exact skills.sh CLI availability remains unverified; no unreviewed skill was installed. | Inspect an approved skill, record source/version/commands, then invoke it for its phase |
| FOUNDATION-006 MCP setup and permission policy | PARTIAL | `progress/MCP.md` is a policy record. GitHub/Supabase/Cloudflare/TestSprite project MCP connectivity is not configured. | Scoped authenticated server status and audit record |
| FOUNDATION-007 TestSprite MCP setup | FAIL | No TestSprite MCP/tool/credential is available. | Configure a dedicated test project, authenticate, and record a non-secret smoke run |
| FOUNDATION-008 checkpoint/progress automation | PARTIAL | Required progress files exist and are updated manually. No checkpoint automation or working Git commit/push path exists. | Simulated interruption/resume from STATUS/NEXT plus a checkpoint commit |

## 4. Toolchain audit

| Tool | Status |
| --- | --- |
| Git | Installed: 2.43.0; unusable in this workspace because `.git` is a read-only overlay. |
| GitHub CLI | Installed: 2.100.0; default account token is invalid. |
| Node / pnpm | Installed: Node 22.23.1, pnpm 11.17.0. Workspace install/build succeeded earlier; public registry DNS failed during the later audit. |
| Rust / Cargo | Installed: rustc/cargo 1.97.1. Offline dependency cache exists; compilation is blocked by missing GLib development packages. |
| rustup | Installed 1.29.0 but `rustup --version` can abort under this sandbox's restricted process/FD environment. |
| Tauri | CLI 2.11.4 is a workspace dependency; Linux prerequisite packages are absent. |
| Python | Installed: 3.12.3. |
| Wrangler / Supabase CLI | Not installed. |
| skills.sh CLI | Not verified: `npx skills --version` exceeded the bounded audit timeout. |
| TestSprite | Not available. |
| Semgrep / CodeQL / Playwright CLIs | Not installed. Vitest is installed as a workspace dependency. |

## 5. Git audit

`git status` and `git remote -v` return “not a git repository.” `.git` is an empty, mode-555 tmpfs mounted by the sandbox at the repository root. This is why `git init` failed: Git cannot create `.git/branches`, and the mount cannot be removed or overwritten from the workspace.

Safe fix: open the source directory in an environment that does not inject the read-only placeholder (or provide an existing clone with a real writable `.git`), then run `git init -b main`, inspect the resulting status, add the intended remote only after the repository owner confirms it, and authenticate GitHub with `gh auth login`. Do not attempt to delete/unmount `.git` from this sandbox. GitHub CLI currently reports an invalid token, so repository creation/push is not authorized or possible.

## 6. Rust build/network blocker investigation

`curl https://index.crates.io/config.json` and host lookup fail with DNS resolution failure. The resolver is the sandboxed systemd stub at `127.0.0.53`; no proxy variables or Cargo registry override were found. This establishes a DNS/network restriction at audit time, not a Cargo registry or certificate configuration problem.

Cargo dependencies are already cached (`Cargo.lock` and `target/` exist). `cargo check --workspace --offline` progresses until native Tauri dependencies fail: `pkg-config` cannot locate `glib-2.0` and `gobject-2.0`. `libglib2.0-dev`, `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, and `librsvg2-dev` are absent. A safe `apt-get` attempt was denied because the sandbox user cannot lock apt directories; `sudo` is prevented by no-new-privileges.

Required host-side correction: grant a development container with DNS plus root/package-manager authority, install the listed Tauri prerequisites, then run `cargo check --workspace`, `cargo test --workspace`, and `cargo clippy --workspace --all-targets -- -D warnings`. Rust work is **not complete** until all three pass.

## 7. MCP audit

Current `codex mcp list` shows only built-in `computer-use` and `node_repl`; neither is Soravo runtime tooling. The current tool context exposes a GitHub connector, but GitHub CLI authentication is invalid and no Soravo repository identity was supplied. A Supabase documentation connector is available, but there is no configured Supabase project/database management connection. Cloudflare and TestSprite MCPs are absent.

| MCP | Configured/authenticated/scope | Safe now? |
| --- | --- | --- |
| GitHub | Connector capability visible; CLI token invalid; no project scope/remote | Read-only connector inspection only after repository identity exists |
| Supabase | Documentation capability only; no project/auth/schema connection | No mutation; defer to Phase 2 |
| Cloudflare | Not configured | No |
| TestSprite | Not configured | No |

MCP remains development tooling only and must never be bundled with the desktop application.

## 8. Skills audit

Available relevant built-in/plugin skills are `openai-docs`, `supabase:supabase`, and `supabase:supabase-postgres-best-practices`. The skills specified in `07_AI_SKILLS.md` for foundation/frontend/desktop/security (find-skills, shadcn, React, Tauri, Rust, GitHub, Playwright, security guidance, Semgrep, CodeQL, etc.) are not installed as skills in this environment. No unreviewed skill was installed.

The OpenAI Docs skill was used for this Codex tooling audit; [official OpenAI guidance](https://learn.chatgpt.com/es-419/docs/extend/mcp) confirms MCP configuration belongs in Codex `config.toml` and project-level configuration is only appropriate for trusted projects. Current configuration contains only `node_repl` as a conventional configured MCP server.

## 9. TestSprite audit

TestSprite is unavailable: no MCP server, CLI, credential, or project is configured. Deterministic setup step: obtain a dedicated non-production TestSprite account/project, add only its approved MCP connection through Codex settings/configuration, authenticate, record scope/date in `progress/MCP.md`, and execute a public fixture smoke test without credentials or customer data.

## 10. Security audit

Positive findings: no environment, PEM, or key files exist; `.gitignore` covers secrets, generated output, models, and local package store; `pnpm-lock.yaml` and `Cargo.lock` exist; Rust crates forbid unsafe code; there is no SQL, auth, admin, filesystem, shell/process, arbitrary network, audio, clipboard, payment, or model-download implementation to expose yet. The desktop capability file grants only `core:default`, and the sole IPC command has no frontend-controlled argument. The CSP now includes `base-uri`, `form-action`, `frame-ancestors`, and `object-src` restrictions.

Open items: the CSP retains `'unsafe-inline'` for styles to support the Vite/Tauri development setup; verify and remove it in production if the compiled app does not require it. Package manifests use `latest` ranges for several dependencies; lockfiles reduce immediate drift, but manifests should be pinned to reviewed compatible versions before release. The previous successful `pnpm audit --prod` found no known vulnerabilities; two subsequent audit-time reruns could not reach npm due DNS failure, so the current advisory status is inconclusive. There are no backend data-access paths to review yet.

## 11. Frontend audit

React 19, TypeScript 6 strict mode, Vite, ESLint, Vitest, Tailwind CSS v4, and shadcn's official Vite configuration are present. `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass after the configuration change. Shadcn reports valid Vite/Tailwind v4 configuration in both apps, but its official `button` registry retrieval is blocked by DNS; there is not yet a generated shadcn component. `apps/website/src/website.tsx` and `apps/desktop/src/app.tsx` are already single large presentation components and should be decomposed before more UI is added. Semantic landmarks, button labels, headings, native details/summary, responsive CSS, and a reduced mobile layout provide a basic accessibility starting point; keyboard, focus, contrast, screen-reader, and automated accessibility tests are missing.

## 12. Specification drift

| Item | Classification | Reason |
| --- | --- | --- |
| Monorepo, Vite React apps, Tauri v2 Rust shell | KEEP | Authorized by TDD and Phase 0/3 direction. |
| Empty TDD directories | KEEP | Structural placeholders only; prevent false claim of implementation. |
| Initial config/transcript contracts | KEEP | Compatible with future settings/transcript phases; no product behavior exposed. |
| Handwritten CSS and monolithic UI components | MODIFY | Does not meet Tailwind/shadcn and composition requirements. |
| Single anchor website | MODIFY | It is a foundation preview, not the required page set. |
| `latest` dependency ranges | MODIFY | Supply-chain reproducibility needs reviewed/pinned ranges. |
| No additional service, cloud, model, or runtime implementation | KEEP | Correctly avoids premature/unauthorized scope. |
| Tauri desktop architecture ADR | KEEP | Required material decision and compliant with TDD. |

## 13. Exact corrective actions

1. Move to a workspace/clone with a writable `.git`; initialize or restore Git, inspect status, then authenticate GitHub and add a confirmed repository remote.
2. Restore DNS and a privileged development environment; install Linux Tauri prerequisites and pass all Rust gates.
3. Review/pin dependency versions, retain lockfiles, and rerun dependency audit with connectivity.
4. Install and review the specified Tailwind/shadcn guidance before any further website or desktop UI work; split current presentation components while doing that foundation correction.
5. Configure only project-scoped GitHub/Supabase/Cloudflare/TestSprite MCPs as their phases require; record scopes and authentication state.
6. Create a dedicated TestSprite test setup and smoke test before relying on it for UI milestones.
7. Complete CI security checks and a checkpoint/commit/push workflow after Git is available.

## 14. Exact next task

**FOUNDATION-001 remediation: establish a real writable Git repository and restore the Linux Tauri build prerequisites.** Do not start Phase 1 UI features until the Git, Rust, frontend-stack, MCP, and TestSprite blockers above are resolved or explicitly accepted by the repository owner.
