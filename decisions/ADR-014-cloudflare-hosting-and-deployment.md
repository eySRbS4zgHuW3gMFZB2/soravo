# ADR-014 — Cloudflare hosting and deployment

Status: Accepted
Date: 2026-09-16

Context: The Soravo website is a Vite + React single-page application (`apps/website`) and has not yet been deployed publicly. The technical design (02_TDD.md §16) required a Cloudflare-hosted deployment and explicitly required verifying current Cloudflare recommendations before implementation, because Cloudflare's current guidance now recommends Workers + Workers Static Assets for new websites and applications instead of Cloudflare Pages. No existing Pages deployment exists. The website is a React Router SPA and therefore requires an SPA fallback so client-side routes work on direct navigation. `soravo.xyz` is currently registered at Namecheap, and Zoho business email uses the domain, so any DNS migration must preserve the existing Zoho MX/TXT records or email continuity breaks. Supabase is the backend and the website talks to it from the browser with only publishable configuration; privileged Supabase service-role credentials must never enter the website bundle. Umami website analytics are optional and env-gated (`VITE_UMAMI_HOST_URL` / `VITE_UMAMI_WEBSITE_ID`) and are website-only. Future desktop binaries are intended to be distributed through GitHub Releases. Razorpay verification is pending; actual Razorpay payment integration is a later CLOUD task (`CLOUD-010`/`CLOUD-011`) and must not be pre-empted by hosting configuration.

The WEB-011 deployment-readiness task first recorded the hosting decision as Workers + Workers Static Assets. WEB-012 revisited that decision against the current product scope and Cloudflare's current Pages documentation and revised it: the website is a static Vite + React SPA with no server-side logic, needs no Worker runtime, and Cloudflare Pages hosts the existing static build on the free plan with native SPA rendering and a static `_headers` mechanism. This ADR is the single authoritative Cloudflare hosting decision for the repository; it supersedes both the WEB-011 framing and the previous "Workers + Workers Static Assets" wording that previously lived in this file. The ADR number is unchanged: the ADR index (`10_ADR_INDEX.md`) and the existing `ADR-013-supabase-devices-and-sessions.md` reserve ADR-013 for the Supabase devices/sessions decision, so this Cloudflare decision remains ADR-014.

Decision:

1. Host the website using **Cloudflare Pages** (static deployment of the Vite build output `apps/website/dist`).
2. The build remains `pnpm build`; the Pages output directory is the Vite output `apps/website/dist` (workspace-resolved).
3. SPA fallback uses Cloudflare Pages' default single-page-application rendering: the Pages output contains **no top-level `404.html` and no `_redirects`**, so Pages matches unmatched paths to `/` (index.html) and React Router direct navigation works. This is asserted by the build-time dist verification.
4. Serve production security headers through the static `_headers` file emitted into `dist/` (Cloudflare Pages parses `_headers` and applies the rules to static asset responses; the project uses no Pages Functions, so the headers apply to every response including SPA-fallback responses).
5. Canonical website: `https://soravo.xyz`.
6. `www` will redirect to the canonical apex domain (`soravo.xyz`) through Cloudflare configuration — never in frontend code.
7. DNS will eventually be managed through Cloudflare (zone + nameserver cutover).
8. Existing Zoho MX/TXT records must be reproduced on the Cloudflare zone before the Namecheap nameserver cutover to preserve business email.
9. Deploy through GitHub Actions (repo-owned, deterministic CI/CD) using Cloudflare Pages direct upload (`wrangler pages deploy apps/website/dist --project-name=soravo` via `cloudflare/wrangler-action@v3`).
10. Deployment credentials use a least-privilege Cloudflare API token (Account > Cloudflare Pages > Edit) and the account ID, both stored as GitHub Actions secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), never in the repository.
11. Public Vite variables (`VITE_*`) may contain only client-safe values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_UMAMI_HOST_URL`, `VITE_UMAMI_WEBSITE_ID`); they are supplied as non-secret GitHub Actions variables. `VITE_E2E_TEST_MODE` is never set in production.
12. Supabase browser access uses only the publishable/anon key, protected by RLS.
13. Supabase service-role credentials never enter the website bundle.
14. Razorpay secrets never enter the website bundle; no Razorpay domains are added to the CSP yet.
15. No Cloudflare R2 is used for website hosting or binary distribution.
16. Future desktop binaries use GitHub Releases.
17. Umami remains env-gated and website-only.
18. No Cloudflare Worker runtime (no Pages Functions, no Worker entrypoint) for the website in V1.
19. Production rollback uses Cloudflare Pages rollback to a previous production deployment or redeploying a known-good Git revision; Git history is never rewritten.

Public-site SEO (WEB-011 P2): `robots.txt`, `sitemap.xml`, a simple SVG favicon, Open Graph/Twitter metadata, and the canonical URL metadata are added so the site is crawl-ready before deployment. A dedicated `og:image` asset is intentionally NOT fabricated; it remains an optional follow-up and its absence is documented. These files live in `apps/website/public/` and survive the Pages build into `apps/website/dist/`.

Alternatives considered:

- **Cloudflare Workers + Workers Static Assets**: Cloudflare's current guidance recommends Workers for new websites, and WEB-011 initially selected it. It is NOT selected here for V1 because the website is a static Vite + React SPA with no server-side logic: Pages hosts the existing `dist/` output directly on the free plan, provides native SPA fallback, and supports the same static `_headers` mechanism. This is a scope fit + free-plan decision, not a claim that Workers is incapable of serving the site. If the website later needs server-side logic, moving to Workers + Static Assets (or adding Pages Functions) is a documented migration path and would require a new ADR.
- **Cloudflare-managed Git integration (Cloudflare-side builds)**: The repository requires deterministic, repo-owned, reviewable CI/CD (02_TDD.md §20; 03_AI_INSTRUCTIONS.md §7). A GitHub Actions pipeline keeps the build and deploy contract inside the repository alongside the existing web/e2e/rust gates, surfaced through PRs and Actions, rather than splitting release automation across two systems.
- **Manual `wrangler` deployment**: Suitable for interactive one-off deploys but not a reproducible release path; not preferred as the primary mechanism. Wrangler may still be used operationally for rollback inspection.

Security impact:
- Only public/client-safe `VITE_*` values may ever be baked into the site; the bundle never contains Supabase service-role credentials or Razorpay keys/secrets.
- Deployment uses a least-privilege Cloudflare API token stored as a GitHub Actions secret; the repository and CI hold no other Cloudflare credentials.
- Production responses carry restrictive security headers including a resource-graph-accurate Content-Security-Policy (no broad wildcard sources), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/microphone/geolocation, `X-Frame-Options: DENY`, and `Cross-Origin-Opener-Policy: same-origin`. Cloudflare Pages applies these via the static `_headers` file to all static asset responses (no Pages Functions, so the `_headers`-not-applied-to-Functions caveat does not apply).
- HTTPS is provided by Cloudflare; HSTS is deliberately deferred until deployment stability is verified (09_SECURITY_BASELINE.md §17), and is not enabled in this task.
- Cloudflare Pages adds `Access-Control-Allow-Origin: *` to static asset responses by default; Soravo exposes no credentialed data over cross-origin requests, and the site's auth/account data is served by Supabase under RLS.
- Supabase RLS remains the authoritative data-boundary control; no client-side authorization trust is introduced.

Performance impact:
- Edge/CDN delivery of static assets with hashed immutable filenames and route-level code splitting already present in the Vite build; Pages serves Gzip/Brotli and under its default caching headers.
- The readiness review recorded the current main-bundle observation at approximately 136.7 kB gzip; bundle size is not currently a deployment blocker and this decision does not alter it.

Operational impact:
- A Cloudflare Pages project (`soravo`, production branch `main`) is created in the later deployment task (not in WEB-012).
- A Cloudflare DNS zone for `soravo.xyz` is created in the later deployment task.
- Namecheap nameserver cutover happens only after the Cloudflare zone reproduces the current Zoho MX (and applicable TXT/SPF/DKIM) records so business email remains functional.
- GitHub Actions deploys the website on pushes to `main`; environment variables are supplied from GitHub Actions variables (client-safe `VITE_*`) and secrets (Cloudflare credentials).
- Production smoke tests verify HTTPS, headers, and SPA behavior after the first controlled deployment.
- Cloudflare Pages production deployments provide recordable deployment history and rollback points.

Testing impact:
- Existing gates remain required: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, and `pnpm e2e`.
- The production build must not include the E2E harness (dev-only, dead-code eliminated) — asserted by a build-time dist verification.
- Production header generation, CSP invariants (no wildcard sources, no Razorpay domains yet), public SEO assets, and the Pages deployment invariants are covered by deterministic Vitest tests (WEB-011 `production-readiness.test.ts`, extended by WEB-012).
- WEB-012 adds deterministic assertions that the Pages output contains no `404.html`/`_redirects` (native SPA rendering), that the GitHub Actions Pages workflow targets `apps/website/dist` via `wrangler pages deploy`, and that no credentials or `VITE_E2E_TEST_MODE` are embedded in the workflow.
- CSP must be validated from the actual build resource graph; deployment smoke tests occur in the later deployment task.

Rollback:
- Cloudflare: roll the Pages production deployment back to the previous production deployment.
- Git: redeploy a known-good Git revision (SHA) through the same pipeline; no force pushes, no history rewrites.
- DNS: reverting nameserver/record changes or restoring the previous zone state.
- Headers/CSP: a header change is a normal redeploy of a previous revision.

Consequences:
- Cloudflare Pages is the hosting decision; it supersedes the earlier Workers + Workers Static Assets wording in this ADR and the 02_TDD.md §16 framing. Workers + Workers Static Assets remains recorded below as the alternative considered but not selected for V1.
- Future Razorpay integration (CLOUD-010/CLOUD-011) must extend the Content-Security-Policy only when it is actually implemented; Razorpay domains must NOT be added now.
- No Cloudflare Worker runtime is introduced for the website; if server-side logic is ever required, revisit this ADR.
- DNS migration carries an email-continuity requirement (Zoho MX/TXT reproduction before cutover).