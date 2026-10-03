# 09 — Security Baseline

This is the minimum security posture. The goal is protection against common attacks and unsafe AI-generated code, not a claim of absolute security.

## 1. Threat model

Protect:
- user accounts;
- payment/entitlement state;
- admin functions;
- device/session records;
- source code;
- release artifacts;
- AI-agent credentials;
- local dictated content;
- model files.

Attackers considered:
- anonymous internet attacker;
- malicious authenticated user;
- compromised account;
- malicious website input;
- malicious payment webhook;
- malicious model metadata;
- malicious GitHub issue/PR content;
- malicious MCP output;
- dependency compromise;
- local untrusted application.

## 2. SQL injection

Mandatory:
- parameterized queries;
- prepared statements;
- typed query builders where appropriate;
- no string concatenation for SQL;
- no dynamic identifiers from untrusted input;
- allowlists for sortable/filterable fields.

Test with:
- quote characters;
- SQL metacharacters;
- boolean payloads;
- time-based payloads where relevant.

## 3. Authentication

- secure password handling through Supabase Auth;
- secure reset flow;
- session expiration policy;
- revocation support;
- no passwords in application database tables;
- no password logging;
- rate limit authentication attempts where applicable.

## 4. Authorization

Every sensitive operation must enforce:
- authentication;
- role;
- ownership;
- action permission.

Admin operations must be server-side.

Test for:
- IDOR/BOLA;
- role escalation;
- changing user IDs in requests;
- accessing another device/session.

## 5. RLS

Every user-owned Supabase table requires appropriate RLS.

Default-deny mindset.

Test:
- anonymous access;
- authenticated user A accessing B;
- admin access;
- service-role paths;
- direct table queries.

## 6. XSS

- React escaping by default;
- avoid raw HTML;
- sanitize rich content if ever introduced;
- Content Security Policy;
- secure headers;
- no unsafe inline scripts without necessity.

## 7. CSRF

For cookie-authenticated state-changing endpoints:
- use appropriate CSRF defenses;
- SameSite cookies where appropriate;
- origin/referer validation where appropriate.

If bearer-token architecture is used instead, document why CSRF exposure differs.

## 8. SSRF

Any feature accepting URLs must:
- validate scheme;
- reject localhost/private/link-local ranges where appropriate;
- prevent DNS rebinding;
- use allowlists for internal service targets;
- set timeouts and response limits.

## 9. Command injection

Never interpolate user-controlled input into shell commands.

Prefer direct process APIs with argument arrays.

Validate all paths and arguments.

## 10. Path traversal

For file operations:
- canonicalize;
- restrict to expected directories;
- reject `..`;
- avoid trusting frontend paths;
- do not expose arbitrary filesystem access through Tauri.

## 11. Tauri security

- least-privilege capabilities;
- strict CSP;
- validate IPC;
- no arbitrary shell;
- no arbitrary filesystem;
- no broad HTTP permissions;
- minimal plugin permissions.

## 12. Secrets

Never commit:
- Supabase service role key;
- Razorpay secret;
- Cloudflare API token;
- GitHub PAT;
- TestSprite API key;
- signing/notarization credentials.

Use secret stores/environment variables.

## 13. Payments

Razorpay:
- server-side secret;
- signature verification;
- webhook signature verification;
- idempotency;
- replay protection;
- authoritative server entitlement state.

Never trust:
- frontend success;
- URL query parameter;
- local app claim;
- client-supplied plan.

## 14. Session/device security

Device IDs must not be treated as authentication secrets.

Revocation must be enforceable server-side.

Avoid collecting hardware identifiers unless strictly necessary.

## 15. Model supply chain

For every model:
- verify license;
- verify source;
- verify checksum;
- verify expected file set;
- verify platform compatibility;
- never execute arbitrary model-provided scripts.

## 16. Dependency supply chain

Use:
- lockfiles;
- Dependabot/Renovate where appropriate;
- dependency audit;
- secret scanning;
- static analysis;
- minimal dependencies.

Review suspicious new dependencies.

## 17. Web security

Recommended:
- HTTPS;
- CSP;
- HSTS after confirming deployment correctness;
- X-Content-Type-Options;
- Referrer-Policy;
- frame-ancestors/frame protections;
- secure cookies;
- restrictive CORS.

## 18. Logging

Do not log:
- audio;
- transcript;
- passwords;
- access tokens;
- payment secrets;
- clipboard;
- raw authorization headers.

## 19. AI-agent security

Apply:
- least privilege;
- tool allowlists;
- project-scoped MCP;
- read-only by default;
- confirmation for destructive operations;
- prompt-injection resistance;
- secret isolation;
- audit trail.

## 20. Security testing gates

Before release:
- OWASP-aligned review;
- SQL injection tests;
- auth/authorization tests;
- RLS tests;
- XSS tests;
- CSRF tests where applicable;
- SSRF/path traversal/command injection review;
- Tauri capability review;
- dependency scan;
- secret scan;
- static analysis;
- MCP review;
- TestSprite security-focused run.

## 21. Security severity

Critical/high vulnerabilities block release.

Medium vulnerabilities require documented mitigation or accepted risk.

Never hide a security issue merely to make a release checklist green.
