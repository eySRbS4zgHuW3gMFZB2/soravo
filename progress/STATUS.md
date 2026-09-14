# Status

Current phase: Phase 1 — Website foundation
Current task: WEB-003 landing/features (copy + consistent primitives) — DONE; next is WEB-004 pricing/download/FAQ
Branch: main (tracks origin/main)
Last commit: e5235d3 (WEB-001/WEB-002); current WEB-003 work pending commit
Last successful test: 2026-09-14 — pnpm lint/typecheck/test/build (website 5 tests, desktop 1 test), pnpm audit --prod, cargo gates ALL PASS
Current implementation state: Routing shell live (see WEB-001). WEB-003 this session: landing copy rewritten around PRD positioning (fast/accurate/local/private; "focused by design" not-list; benchmark-driven engine FAQ; reframed feature trio), features page expanded into shadcn Card grid of 6 capabilities + 4 persona cards + Button CTA, small CSS additions (`.scope-list`, `.persona-grid`, `.page-actions`). Primitives (button/card) used consistently across content pages; bespoke landing identity CSS preserved.
Files changed since e5235d3: `apps/website/src/pages/{landing,features}.tsx`, `apps/website/src/styles.css`, `apps/website/src/website.test.tsx`
Known failures: None. Remaining env gaps are human-gated (TestSprite account, Supabase project, Cloudflare account, signing credentials).
Security status: No secrets tracked; `core:default` capability; `unsafe_code` forbidden in crates; `pnpm audit --prod` clean; website dev server sends nosniff + strict-origin-when-cross-origin. Open: CSS `style-src 'unsafe-inline'` (verify for prod), `latest` ranges (pin before release).
TestSprite status: Not configured; requires dedicated account/project (human-gated).
Benchmark status: Not started; required before an STT production engine is selected (`12_BENCHMARK_PROTOCOL.md`).
Next exact action: WEB-004 — pricing/download/FAQ page depth per `05_TASK_BREAKDOWN.md`; keep honesty rules (no pseudo-live prices, no fake downloads).