# Next

Resume task: Phase 1 — Website foundation. WEB-003 (landing/features) is DONE and will be committed with this change set. Proceed to WEB-004 pricing/download/FAQ.
Read first: `progress/OPENCODE_TAKEOVER.md`, `progress/STATUS.md`, `01_PRD.md` (§5 website, §4.2–4.11 features), `05_TASK_BREAKDOWN.md` (WEB-004), `06_DOD_QA.md`, `09_SECURITY_BASELINE.md`.
Inspect: `apps/website/src/pages/` (landing + features carry the WEB-003 copy/design), `components/ui/{button,card}.tsx`, `styles.css` (bespoke brand CSS + prepended shadcn tokens).

Exact next implementation step:
1. WEB-004 — deepen pricing/download/FAQ pages: price structure (~$12/mo subscription, ~$50 lifetime are PRD targets but final prices are a business decision — keep the site honest, no pseudo-live prices until the payment flow exists), staged download matrix (macOS/Windows, checksums when release pipeline is live), expanded FAQ coverage. Apply shadcn primitives consistently; keep bespoke brand styling where it defines site identity.
2. WEB-005 — legal/support pages depth (privacy: the on-device boundary + Umami-only website analytics; terms/refund prepared-AOP treatment).
3. Re-verify per page: accessibility landmarks/keyboard, responsive layout, no private-dictation analytics.

Tests to run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, `cargo fmt --all -- --check`, `cargo check --workspace`, `cargo test --workspace`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`.

Security checks: no secrets in the bundle; CSP/headers on the website dev server and any deploy config; no analytics on private dictation data; Umami (Phase WEB-006) only for website behavior events.

Expected completion condition: Landing and features match PRD positioning, primitives are used consistently, all gates pass, committed and pushed; a fresh agent can resume at WEB-004.

Do not change: Do not add cloud STT, transcripts/audio upload, or desktop telemetry. Do not select an STT engine before benchmarking. Do not add Supabase/Cloudflare/Razorpay secrets without the owner's credentials via the approved secret mechanism. Do not silently change Tauri/Supabase/Razorpay/Cloudflare/Parakeet architecture. Do not run `git reset --hard` / `git clean -fd` / force-push without explicit human authorization.