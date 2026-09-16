# ADR-014 — Cloudflare hosting and deployment

Status: Accepted
Date: 2026-09-16

Context: The Soravo website is a Vite + React single-page application (`apps/website`) and has not yet been deployed publicly. The technical design (02_TDD.md §16) required a Cloudflare-hosted deployment and explicitly required verifying current Cloudflare recommendations before implementation, because Cloudflare's current guidance now recommends Workers + Workers Static Assets for new websites and applications instead of Cloudflare Pages. No existing Pages deployment exists, so there is no legacy hosting product to preserve. The website is a React Router SPA and therefore requires an SPA fallback so client-side routes work on direct navigation. `soravo.xyz` is currently registered at Namecheap, and Zoho business email uses the domain, so any DNS migration must preserve the existing Zoho MX/TXT records or email continuity breaks. Supabase is the backend and the website talks to it from the browser with only publishable configuration; privileged Supabase service-role credentials must never enter the website bundle. Umami website analytics are optional and env-gated (`VITE_UMAMI_HOST_URL` / `VITE_UMAMI_WEBSITE_ID`) and are website-only. Future desktop binaries are intended to be distributed through GitHub Releases. Razorpay verification is pending; actual Razorpay payment integration is a later CLOUD task (`CLOUD-010`/`CLOUD-011`) and must not be pre-empted by hosting configuration.

The completed website deployment-readiness review reviewed this exact state and recorded the hosting decision in WEB-011: Workers + Workers Static Assets, repo-owned CI/CD via GitHub Actions, static security headers, and P2 public-site SEO assets. This ADR makes that decision authoritative.

Decision:

1. Host the website using **Cloudflare Workers + Workers Static Assets**.
2. Deploy the Vite `dist/` output as the static asset directory.
3. Configure SPA fallback (React Router direct-navigation support) as part of the deployment configuration.
4. Serve production security headers through the static-assets header mechanism (a `_headers` file in the deployed static asset directory).
5. Canonical website: `https://soravo.xyz`.
6. `www` will redirect to the canonical apex domain (`soravo.xyz`) through Cloudflare configuration — never in frontend code.
7. DNS will eventually be managed through Cloudflare (zone + nameserver cutover).
8. Existing Zoho MX/TXT records must be reproduced on the Cloudflare zone before the Namecheap nameserver cutover to preserve business email.
9. Deploy through GitHub Actions (repo-owned, deterministic CI/CD).
10. Deployment credentials use a least-privilege Cloudflare API token stored as a GitHub Actions secret, never in the repository.
11. Public Vite variables (`VITE_*`) may contain only client-safe values.
12. Supabase browser access uses only the publishable/anon key, protected by RLS.
13. Supabase service-role credentials never enter the website bundle.
14. Razorpay secrets never enter the website bundle.
15. No Cloudflare R2 is used for website hosting or binary distribution.
16. Future desktop binaries use GitHub Releases.
17. Umami remains env-gated and website-only.
18. Production rollback uses Cloudflare deployment/version rollback or redeploying a known-good Git revision; Git history is never rewritten.

Public-site SEO (WEB-011 P2): `robots.txt`, `sitemap.xml`, a simple SVG favicon, Open Graph/Twitter metadata, and the canonical URL metadata are added so the site is crawl-ready before deployment. A dedicated `og:image` asset is intentionally NOT fabricated in this task; it remains an optional follow-up and its absence is documented.

Alternatives considered:

- **Cloudflare Pages**: Workers Static Assets can do everything Pages can do, and Cloudflare's current guidance recommends Workers + Workers Static Assets for all new websites and applications (including static sites, SPAs, and full-stack apps). Migration from Pages is a first-class documented path, so nothing commits us to Pages later. This is a current-guidance plus determinism decision, not a claim that Pages is incapable of hosting this website.
- **Cloudflare-managed Git deployment (Workers Builds)**: The repository requires deterministic, repo-owned, reviewable CI/CD (02_TDD.md §20; 03_AI_INSTRUCTIONS.md §7). A GitHub Actions deployment pipeline keeps the build and deploy contract inside the repository alongside the existing web/e2e/rust gates, surfaced through PRs and Actions, rather than splitting release automation across two systems.
- **Manual `wrangler` deployment**: Suitable for interactive one-off deploys but not a reproducible release path; not preferred as the primary mechanism. Wrangler may still be used operationally for version/rollback inspection.

Security impact:
- Only public/client-safe `VITE_*` values may ever be baked into the site; the bundle never contains Supabase service-role credentials or Razorpay keys/secrets.
- Deployment uses a least-privilege Cloudflare API token; the repository and CI hold no other Cloudflare credentials.
- Production responses carry restrictive security headers including a resource-graph-accurate Content-Security-Policy (no broad wildcard sources), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/microphone/geolocation, `X-Frame-Options: DENY`, and `Cross-Origin-Opener-Policy: same-origin`.
- HTTPS is provided by Cloudflare; HSTS is deliberately deferred until deployment stability is verified (09_SECURITY_BASELINE.md §17), and is not enabled in this task.
- Supabase RLS remains the authoritative data-boundary control; no client-side authorization trust is introduced.

Performance impact:
- Edge/CDN delivery of static assets with hashed immutable filenames and route-level code splitting already present in the Vite build.
- Automatic Cloudflare compression and HTTP protocol negotiation apply where applicable.
- The readiness review recorded the current main-bundle observation at approximately 136.7 kB gzip; bundle size is not currently a deployment blocker and this decision does not alter it.

Operational impact:
- A Cloudflare Worker/static-assets project is created in the later deployment task (not here).
- A Cloudflare DNS zone for `soravo.xyz` is created in the later deployment task.
- Namecheap nameserver cutover happens only after the Cloudflare zone reproduces the current Zoho MX (and applicable TXT/SPF/DKIM) records so business email remains functional.
- GitHub Actions deploys the website; environment variables are set in the deployment workflow/CI secret store.
- Production smoke tests verify HTTPS, headers, and SPA behavior after the first controlled deployment.
- Cloudflare deployment versions provide recordable deployment history and rollback points.

Testing impact:
- Existing gates remain required: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, and `pnpm e2e`.
- The production build must not include the E2E harness (dev-only, dead-code eliminated) — asserted by a build-time dist verification.
- Production header generation, CSP invariants (no wildcard sources, no Razorpay domains yet), and public SEO assets are covered by deterministic Vitest tests added in WEB-011.
- CSP must be validated from the actual build resource graph; deployment smoke tests occur in the later deployment task.

Rollback:
- Cloudflare: roll the Workers deployment back to the previous deployment version.
- Git: redeploy a known-good Git revision (SHA) through the same pipeline; no force pushes, no history rewrites.
- DNS: reverting nameserver/record changes or restoring the previous zone state.
- Headers/CSP: a header change is a normal redeploy of a previous revision.

Consequences:
- Workers + Workers Static Assets is the hosting decision; it supersedes the 02_TDD.md §16 "Cloudflare Pages" framing for this project (that section already anticipated verifying current Cloudflare guidance, which this decision satisfies).
- Future Razorpay integration (CLOUD-010/CLOUD-011) must extend the Content-Security-Policy only when it is actually implemented; Razorpay domains must NOT be added now.
- No Cloudflare Pages migration is expected.
- DNS migration carries an email-continuity requirement (Zoho MX/TXT reproduction before cutover).