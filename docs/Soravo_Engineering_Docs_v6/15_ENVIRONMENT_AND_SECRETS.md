# 15 — Environment and Secrets
Public website build variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Server-only Razorpay:
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET

Supabase platform values may include:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Service role is never client-side.

Cloudflare deployment uses secret storage for API token/account ID and public Vite variables.

Report secret state only as EXISTS/MISSING/UNKNOWN. Never print values.

Use TEST credentials for TEST E2E. Never substitute LIVE credentials.

Human escalation is required for credentials, 2FA, signing keys, production provider activation, legal/business decisions and irreversible external configuration.
