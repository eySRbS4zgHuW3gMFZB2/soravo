# 14 — CI/CD and Branching
Normal engineering uses feature branches, never direct main edits.
Format: `<task-id>/<short-description>`.

Focused commits only. Never force-push or rewrite shared history.

CI families:
- web lint/typecheck/test/build;
- Playwright;
- Rust fmt/clippy/test;
- cargo audit/deny;
- desktop build;
- security audit;
- release;
- deployment.

Classify failures:
A code; B missing env/secret; C external service; D workflow config; E historical/stale; F unrelated.

Deployment success is not CI success. CI success is not deployment success. Record both.

The supplied 038A audit demonstrated that Cloudflare deployment can succeed while CI fails because deployment runs a narrower build path. Preserve this distinction in future reports.

PR evidence must include exact run IDs, commit, failed job/step, error and reproduction.
