# Next

Resume task: Phase 1 — Website foundation. WEB-001 shell is DONE and committed with this change set; WEB-002 tokens/`button`/`card` wired in the same commit. Proceed to WEB-003 content/design refinement.
Read first: `progress/OPENCODE_TAKEOVER.md`, `progress/STATUS.md`, `01_PRD.md` (§5 website), `02_TDD.md` (§3 frontend, §16 website deployment), `05_TASK_BREAKDOWN.md` (WEB-*), `06_DOD_QA.md`, `09_SECURITY_BASELINE.md`.
Inspect: `apps/website/src/` (routed `app.tsx`, `pages/*`, `components/layout/*`, `components/ui/{button,card}.tsx`, `styles.css` with prepended shadcn tokens), `apps/website/package.json`, `.github/workflows/ci.yml`.

Exact next implementation step:
1. WEB-003 — refine copy and consistent use of shadcn primitives across pages (cards/buttons on landing sections); check responsive behavior with the new design tokens on all routes.
2. WEB-004 — website deployment prerequisites (CSP review, metadata/OG tags, analytics gate for Umami) per `02_TDD.md` §16 and `05_TASK_BREAKDOWN.md`; then deployment host choice is human-gated (Cloudflare).
3. Re-verify per page: accessibility landmarks/keyboard, responsive layout, no private-dictation analytics.

Tests to run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, `cargo fmt --all -- --check`, `cargo check --workspace`, `cargo test --workspace`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`.

Security checks: no secrets in the bundle; CSP/headers on the website dev server and any deploy config; no analytics on private dictation data; Umami (Phase WEB-006) only for website behavior events.

Expected completion condition: Website has routed pages for the required set, uses the shadcn design system, passes all gates, is committed and pushed; a fresh agent can resume at WEB-003.

Do not change: Do not add cloud STT, transcripts/audio upload, or desktop telemetry. Do not select an STT engine before benchmarking. Do not add Supabase/Cloudflare/Razorpay secrets without the owner's credentials via the approved secret mechanism. Do not silently change Tauri/Supabase/Razorpay/Cloudflare/Parakeet architecture. Do not run `git reset --hard` / `git clean -fd` / force-push without explicit human authorization.