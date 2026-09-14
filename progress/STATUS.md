# Status

Current phase: Phase 1 — Website foundation
Current task: WEB-004 pricing/download/FAQ — DONE; next is WEB-005 legal/support pages
Branch: main (tracks origin/main)
Last commit: 2a5a812 (WEB-003); current WEB-004 work pending commit
Last successful test: 2026-09-14 — pnpm lint/typecheck/test/build (website 8 tests, desktop 1 test), pnpm audit --prod, cargo gates ALL PASS
Current implementation state: Pricing page now a real two-plan grid (Monthly ≈$12, One-time ≈$50) using the shadcn Card primitive, each clearly labeled "evaluated target" with an explicit "not an offer / nothing billed today" disclaimer, plus launch-list CTA. Download page is a staged matrix (macOS/Windows cards with system + artifact + "No build yet") and a checksum-verification note; Linux deferred noted. FAQ expanded 5→10 Q&A (engine selection, auto-injection, network boundary, cost, download verification) with a support CTA. Minor CSS: `.plan-kicker/.plan-price/.plan-list/.plan-terms/.plan-disclaimer/.verification-note`. Primitives (Card/Button/PageIntro) consistent; no new dependencies; fidelity rules honored (no pseudo-live prices, no fake builds).
Files changed since 2a5a812: `apps/website/src/pages/{pricing,download,faq}.tsx`, `apps/website/src/styles.css`, `apps/website/src/website.test.tsx`
Known failures: None. Remaining env gaps are human-gated (TestSprite account, Supabase project, Cloudflare account, signing credentials).
Security status: No secrets tracked; `core:default` capability; `unsafe_code` forbidden in crates; `pnpm audit --prod` clean; website dev server sends nosniff + strict-origin-when-cross-origin. Open: CSS `style-src 'unsafe-inline'` (verify for prod), `latest` ranges (pin before release).
TestSprite status: Not configured; requires dedicated account/project (human-gated).
Benchmark status: Not started; required before an STT production engine is selected (`12_BENCHMARK_PROTOCOL.md`).
Next exact action: WEB-005 — legal/support page depth (privacy wording on the on-device boundary + Umami-only web analytics; terms/refund "prepared as-boundary" treatment; support/contact launcher), per `05_TASK_BREAKDOWN.md`.