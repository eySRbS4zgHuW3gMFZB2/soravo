# 14 — Environment and Secret Handling

## Development accounts

Expected:
- GitHub
- Cloudflare
- Supabase
- Razorpay
- Zoho Mail
- TestSprite
- model hosting/source account if needed

## Environment variables

Use names such as:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
GITHUB_TOKEN
TESTSPRITE_API_KEY
UMAMI_WEBSITE_ID
UMAMI_HOST_URL
```

Only the variables actually required by each component should be present.

## Client-safe variables

Only public/client-safe values may enter:
- website bundle;
- desktop bundle.

Examples:
- Supabase project URL;
- Supabase anonymous/public key;
- public Umami website ID;
- public API base URL.

Never expose:
- Supabase service role;
- Razorpay secret;
- webhook secret;
- Cloudflare API token;
- GitHub write token;
- TestSprite API key.

## Secret files

Local secret files:
- must be gitignored;
- must not be uploaded to TestSprite;
- must not be attached to bug reports;
- must not be copied into AI prompts.

## Production

Use platform secret stores where available.

Rotate credentials after suspected exposure.

## MCP credentials

Prefer OAuth/project-scoped access.

If tokens are unavoidable:
- least privilege;
- environment variable;
- no repository storage;
- documented owner;
- rotation plan.

## Cloudflare Pages deployment (GitHub Actions)

Released by the repo-owned workflow `.github/workflows/pages-deployment.yaml` on pushes to `main` (ADR-014).

GitHub Actions secrets (never in the repository, never in `.env`):
- `CLOUDFLARE_API_TOKEN` — least-privilege token scoped to Account > Cloudflare Pages > Edit;
- `CLOUDFLARE_ACCOUNT_ID`.

GitHub Actions variables (client-safe build values only):
- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_ANON_KEY`;
- `VITE_UMAMI_HOST_URL`;
- `VITE_UMAMI_WEBSITE_ID`.

Never add `VITE_E2E_TEST_MODE` to the deploy workflow. Never add `VITE_SUPABASE_SERVICE_ROLE_KEY` or any Razorpay secret to the workflow or the website bundle; the service role is server-only for other components.

## Payment secrets

Payment verification happens server-side only.

## Code signing

Signing/notarization secrets must never be given to an AI agent with broad filesystem access unless the workflow explicitly requires it and the risk is accepted.

Prefer CI secret stores and controlled release workflows.
