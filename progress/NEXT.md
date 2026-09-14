# Next

Resume task: Phase 1 — Website foundation. WEB-006 (Umami integration) is DONE and committed. Proceed to WEB-007 accessibility/performance.
Read first: `progress/OPENCODE_TAKEOVER.md`, `progress/STATUS.md`, `01_PRD.md`, `05_TASK_BREAKDOWN.md` (WEB-007), `06_DOD_QA.md`, `09_SECURITY_BASELINE.md`, `frontend-accessibility` and `web-design-guidelines` skills.
Inspect: `apps/website/src/pages/*`, `apps/website/src/components/ui/button.tsx` (pre-existing base-ui `nativeButton` semantics warning on `render`-overridden Buttons — fix with `nativeButton={false}` or real buttons during WEB-007), `apps/website/src/styles.css`, `apps/website/vite.config.ts` (dev headers only; no CSP yet), `apps/website/index.html`.

Exact next implementation step:
1. WEB-007 — accessibility and performance pass on the website. Verify: semantic headings/hierarchy on every page, keyboard focus and focus-visible styling, landmark structure (`main` id="main" exists, add skip link), contrast for all evaluated-target text, reduced-motion handling, base-ui Button semantics warnings, route-level code splitting where cheap, and document that Core Web Vitals must be measured at deploy time (Umami `data-performance` can be enabled then). No behavioral tracking changes.
2. Keep the analytics boundary honest: unchanged from WEB-006. Do not add event tracking beyond website-behavior events; do not add Umami `identify()` (no session IDs).
3. Do not claim performance numbers on the public site until measured on documented hardware (`06_DOD_QA.md` §14).

Tests to run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, `cargo fmt --all -- --check`, `cargo check --workspace`, `cargo test --workspace`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`.

Security checks: no secrets in the bundle; if a CSP is added, `script-src` must include the configured Umami host when analytics is enabled (record SRI feasibility at that point); no private dictation data in any analytics call.

Expected completion condition: WEB-007 done, all gates pass, committed and pushed; a fresh agent can resume at WEB-008.

Do not change: Do not add cloud STT, transcripts/audio upload, or desktop telemetry. Do not select an STT engine before benchmarking. Do not add Supabase/Cloudflare/Razorpay secrets without the owner's credentials via the approved secret mechanism. Do not silently change Tauri/Supabase/Razorpay/Cloudflare/Parakeet architecture. Do not run `git reset --hard` / `git clean -fd` / force-push without explicit human authorization. Do not install skills/MCP servers merely because they are listed in the registry.