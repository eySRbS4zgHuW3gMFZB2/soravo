# Status

Current phase: Phase 1 — Website foundation
Current task: WEB-001 site shell (routing + layout + required page set) — DONE; WEB-002 design system tokens wired; next is WEB-003 site content refinement
Branch: main (tracks origin/main)
Last commit: dbb03c5 (takeover remediation); current WEB-001 work pending commit
Last successful test: 2026-09-14 — pnpm lint/typecheck/test/build (website 3 tests, desktop 1 test), pnpm audit --prod, cargo gates ALL PASS
Current implementation state: Website is now fully routed — BrowserRouter in `app.tsx`, 12 content routes + 404 under a shared `Layout` (SiteHeader/SiteFooter/scroll-restore), landing ported to `pages/landing.tsx`, dedicated content pages for features/pricing/download/faq/support/privacy/terms/refund/login/account/admin. shadcn base-nova theme tokens (Soravo palette, light + dark) prepended to `styles.css` and the handwritten site CSS preserved below it; `button` and `card` primitives generated and used on the new pages. Vitest now runs in jsdom with explicit cleanup. Desktop Tauri shell + `runtime_status`; `crates/config` + `crates/transcript` tests green.
Files changed since dbb03c5: `apps/website/src/{app.tsx,pages/*,components/layout/*,components/page-intro.tsx,components/ui/card.tsx,main.tsx,styles.css,website.test.tsx,test-setup.ts,vite.config.ts}`, `apps/website/package.json`, `pnpm-lock.yaml`; deleted `apps/website/src/website.tsx`
Known failures: None. Remaining env gaps are human-gated (TestSprite account, Supabase project, Cloudflare account, signing credentials).
Security status: No secrets tracked; `core:default` capability; `unsafe_code` forbidden in crates; `pnpm audit --prod` clean; website dev server sends nosniff + strict-origin-when-cross-origin. Open: CSS `style-src 'unsafe-inline'` (verify for prod), `latest` ranges (pin before release).
TestSprite status: Not configured; requires dedicated account/project (human-gated).
Benchmark status: Not started; required before an STT production engine is selected (`12_BENCHMARK_PROTOCOL.md`).
Next exact action: WEB-003 — refine site copy/content and apply shadcn primitives consistently; then WEB-004/005 per `05_TASK_BREAKDOWN.md` (deployment pre-req).