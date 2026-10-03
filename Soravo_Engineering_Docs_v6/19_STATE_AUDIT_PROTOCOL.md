# 19 — State Audit Protocol
Run at every new session and milestone boundary.

Git:
```bash
git fetch origin --prune
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git log -n 20 --oneline --decorate
git worktree list
git diff --check
```

Environment/tooling:
```bash
opencode --version
opencode mcp list
find .opencode -maxdepth 3 -type f | sort
```

Inspect root/package/Cargo manifests and only task-relevant source.

CI: inspect latest main and relevant PR runs.

External:
Cloudflare = deployed commit/status/URL.
Supabase = function list, verify_jwt settings, secret existence without values.
Razorpay = TEST/LIVE mode, webhook endpoint/events, Plans/subscriptions, transaction evidence.

Report:
AUDIT SHA, DATE, BRANCH, ORIGIN, WORKTREE, CI, DEPLOYMENT, SUPABASE, RAZORPAY, WEBSITE, DESKTOP, PAYMENT, MODEL LICENSING, BENCHMARK, SECURITY, TESTS, BLOCKERS, NEXT TASK.

If VM differs from GitHub, classify and preserve local work before deciding what to do.
