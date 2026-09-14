# Next

Resume task: Phase 1 — Website foundation. WEB-004 (pricing/download/FAQ) is DONE and will be committed with this change set. Proceed to WEB-005 legal/support pages.
Read first: `progress/OPENCODE_TAKEOVER.md`, `progress/STATUS.md`, `01_PRD.md` (§5 website, §6–8 commercial/auth), `05_TASK_BREAKDOWN.md` (WEB-005), `06_DOD_QA.md`, `09_SECURITY_BASELINE.md`.
Inspect: `apps/website/src/pages/` (pricing/download/faq carry the WEB-004 work; privacy/terms/refund/support are the WEB-005 targets), `components/ui/*`, `styles.css`.

Exact next implementation step:
1. WEB-005 — deepen legal/support pages: privacy (state the on-device boundary precisely: audio/transcripts/keystrokes/clipboard/history never leave the device; Umami is website-behavior analytics only, separate from product data; account/server functions listed explicitly); terms + refund as honest "prepared, published when the payment flow exists" treatment consistent with the pricing disclaimers; support/contact as a working launcher (email CTA, documented response commitment). Keep a consistent minimal legal scaffold — no invented obligations.
2. Re-verify per page: accessibility landmarks/keyboard, responsive layout, no private-dictation analytics; headings hierarchy on all content pages.
3. Confirm any copy change to landing/features/pricing terminology stays consistent with the PRD positioning and honesty rules.

Tests to run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, `cargo fmt --all -- --check`, `cargo check --workspace`, `cargo test --workspace`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`.

Security checks: no secrets in the bundle; CSP/headers on the website dev server and any deploy config; no analytics on private dictation data; Umami (Phase WEB-006) only for website behavior events.

Expected completion condition: Pricing/download/FAQ pages are honest, complete, primitive-consistent, all gates pass, committed and pushed; a fresh agent can resume at WEB-005.

Do not change: Do not add cloud STT, transcripts/audio upload, or desktop telemetry. Do not select an STT engine before benchmarking. Do not add Supabase/Cloudflare/Razorpay secrets without the owner's credentials via the approved secret mechanism. Do not silently change Tauri/Supabase/Razorpay/Cloudflare/Parakeet architecture. Do not run `git reset --hard` / `git clean -fd` / force-push without explicit human authorization.