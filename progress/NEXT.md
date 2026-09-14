# Next

Resume task: Phase 1 — Website foundation. WEB-005 (legal/support pages) is DONE and committed. Proceed to WEB-006 Umami integration.
Read first: `progress/OPENCODE_TAKEOVER.md`, `progress/STATUS.md`, `01_PRD.md` (§5 website + Umami, §10 privacy), `05_TASK_BREAKDOWN.md` (WEB-006), `06_DOD_QA.md`, `09_SECURITY_BASELINE.md`, `README.md` (website analytics are Umami, limited to website behavior; Umami data and product/admin data are separate).
Inspect: `apps/website/src/main.tsx`, `apps/website/src/pages/*`, `apps/website/package.json`, `apps/website/src/styles.css`, `progress/STATUS.md` security notes.

Exact next implementation step:
1. WEB-006 — integrate Umami for website analytics only, gated behind a public website ID (`UMAMI_WEBSITE_ID` / VITE_* client-safe var per `14_ENVIRONMENT_AND_SECRETS.md`), tracking only website-behavior events: page views, pricing-page interaction, download button clicks, OS selection, signup/purchase CTA, navigation. Never track dictated text, audio, keystrokes, clipboard, history, or raw device identifiers. If no Umami host/ID is available, keep the integration inert/no-op (do not fake analytics).
2. Keep the privacy page's stated boundary accurate: if analytics ship, the "Website analytics boundary" commit stays true (website-behavior only, separate from product/account data); if analytics are NOT enabled yet, do not claim they are live.
3. Confirm no analytics script or event ever touches dictation data, and verify `document.referrer`/navigation events contain no private content.

Tests to run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, `cargo fmt --all -- --check`, `cargo check --workspace`, `cargo test --workspace`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`.

Security checks: no secrets in the bundle; Umami host/ID are public/client-safe; CSP must not break analytics (track UMD script vs CSP `script-src`); no private dictation data in any analytics call.

Expected completion condition: Umami analytics correctly wired for website behavior only, honest and inert when no ID/host is configured, all gates pass, committed and pushed; a fresh agent can resume at WEB-007.

Do not change: Do not add cloud STT, transcripts/audio upload, or desktop telemetry. Do not select an STT engine before benchmarking. Do not add Supabase/Cloudflare/Razorpay secrets without the owner's credentials via the approved secret mechanism. Do not silently change Tauri/Supabase/Razorpay/Cloudflare/Parakeet architecture. Do not run `git reset --hard` / `git clean -fd` / force-push without explicit human authorization. Do not install skills/MCP servers merely because they are listed in the registry.