# Next

Resume task: Phase 1 — Website foundation. WEB-007 (accessibility/performance) is DONE and committed. Proceed to WEB-008.
Read first: `progress/OPENCODE_TAKEOVER.md`, `progress/STATUS.md`, `01_PRD.md`, `05_TASK_BREAKDOWN.md` (WEB-008), `06_DOD_QA.md`, `09_SECURITY_BASELINE.md`.
Inspect: `05_TASK_BREAKDOWN.md` for what WEB-008 requires.

Exact next implementation step:
1. Open `05_TASK_BREAKDOWN.md` and identify WEB-008. Implement per the PRD with the standard gates.
2. Keep the analytics, privacy, and on-device boundaries honest: unchanged from WEB-006/WEB-007. No behavioral tracking changes.
3. Do not claim performance numbers on the public site until measured on documented hardware (`06_DOD_QA.md` §14).

Tests to run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, `cargo fmt --all -- --check`, `cargo check --workspace`, `cargo test --workspace`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`.

Security checks: no secrets in the bundle; if a CSP is added for production, `script-src` must include the configured Umami host when analytics is enabled (record SRI feasibility at that point); no private dictation data in any analytics call.

Expected completion condition: WEB-008 done, all gates pass, committed and pushed; a fresh agent can resume at WEB-009.

Do not change: Do not add cloud STT, transcripts/audio upload, or desktop telemetry. Do not select an STT engine before benchmarking. Do not add Supabase/Cloudflare/Razorpay secrets without the owner's credentials via the approved secret mechanism. Do not silently change Tauri/Supabase/Razorpay/Cloudflare/Parakeet architecture. Do not run `git reset --hard` / `git clean -fd` / force-push without explicit human authorization. Do not install skills/MCP servers merely because they are listed in the registry.