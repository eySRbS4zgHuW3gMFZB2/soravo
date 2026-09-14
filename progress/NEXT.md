# Next

Resume task: Phase 1 — Website foundation. WEB-001 site shell first, then WEB-002 shadcn design system.
Read first: `progress/OPENCODE_TAKEOVER.md`, `progress/STATUS.md`, `01_PRD.md` (§5 website), `02_TDD.md` (§3 frontend, §16 website deployment), `04_IMPLEMENTATION_PLAN.md` (Phase 1), `05_TASK_BREAKDOWN.md` (WEB-*), `06_DOD_QA.md`, `09_SECURITY_BASELINE.md`.
Inspect: `apps/website/src/` (current single-page `website.tsx`, `styles.css`, `components/ui/button.tsx`), `apps/website/package.json`, both `components.json`, `tsconfig.base.json`, `.github/workflows/ci.yml`.

Exact next implementation step:
1. WEB-001 — add routing to `apps/website` (react-router), create layout shell resolving the required page set: landing, features, pricing, download, FAQ, support/contact, privacy, terms, refund/cancellation, login/account, dashboard, admin dashboard. Keep unstarted product claims honest ("coming soon" for not-yet-live flows).
2. WEB-002 — wire shadcn Tailwind v4 theme tokens into `apps/website/src/styles.css`, add base UI primitives (`card`, `button` already generated), decompose `website.tsx` into page components.
3. Verify per page: accessibility landmarks/keyboard, responsive layout, no private-dictation analytics.

Tests to run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, `cargo fmt --all -- --check`, `cargo check --workspace`, `cargo test --workspace`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`.

Security checks: no secrets in the bundle; CSP/headers on the website dev server and any deploy config; no analytics on private dictation data; Umami (Phase WEB-006) only for website behavior events.

Expected completion condition: Website has routed pages for the required set, uses the shadcn design system, passes all gates, is committed and pushed; a fresh agent can resume at WEB-002/WEB-003.

Do not change: Do not add cloud STT, transcripts/audio upload, or desktop telemetry. Do not select an STT engine before benchmarking. Do not add Supabase/Cloudflare/Razorpay secrets without the owner's credentials via the approved secret mechanism. Do not silently change Tauri/Supabase/Razorpay/Cloudflare/Parakeet architecture.