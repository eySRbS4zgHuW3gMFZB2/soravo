# 06 — Definition of Done and QA

## 1. Universal DoD

A task is done only when:
- requirements implemented;
- tests added/updated;
- tests pass;
- relevant security checks pass;
- no new warnings left unexplained;
- documentation updated;
- progress updated;
- diff reviewed;
- commit created;
- branch pushed;
- PR opened/updated.

## 2. Severity

- P0: security breach, data loss, broken installation, unusable core dictation, payment corruption
- P1: major feature failure, frequent transcription corruption, account isolation failure
- P2: meaningful but non-blocking defect
- P3: cosmetic/minor

P0/P1 block release.

## 3. Audio QA

Test:
- first word after hotkey
- quiet speech
- fast speech
- long speech
- pauses
- background noise
- device disconnect
- device reconnect
- microphone change
- repeated sessions
- rapid start/stop
- cancellation
- 30+ minute soak

## 4. STT QA

Measure:
- first partial
- final latency
- real-time factor
- memory
- CPU/GPU
- stability
- punctuation
- capitalization
- language
- repeated phrases
- overlapping chunks
- session boundaries

## 5. Transcript QA

Verify:
- tentative text never injected;
- committed text injected exactly once;
- finalization does not duplicate;
- stale session results ignored;
- cancellation does not leak old results.

## 6. Hotkey QA

Verify:
- default shortcut;
- custom shortcut;
- modifier combinations;
- invalid combination;
- conflict;
- Escape cancellation;
- runtime replacement;
- rollback;
- hold;
- toggle;
- repeated sessions.

## 7. Pill QA

Verify:
- pop in;
- listening;
- transcribing;
- finalizing;
- done;
- error;
- rapid state changes;
- window/display scaling;
- reduced-motion accessibility.

## 8. Dashboard QA

User:
- cannot view another user's data;
- cannot access admin;
- password change works;
- password reset works;
- current logout works;
- other-session logout works;
- device revocation works if supported.

Admin:
- non-admin denied;
- metrics correct;
- user search scoped;
- unique user id shown;
- subscription/device status correct;
- no unnecessary PII exposed.

## 9. Security QA

Must test:
- SQL injection;
- XSS;
- CSRF where applicable;
- auth bypass;
- IDOR/BOLA;
- privilege escalation;
- session fixation/hijacking;
- insecure direct object references;
- path traversal;
- command injection;
- SSRF where URLs are accepted;
- malicious file/model metadata;
- secret leakage;
- insecure CORS;
- weak CSP;
- overbroad Tauri capabilities.

Use parameterized queries.

## 10. Payment QA

Use Razorpay sandbox/test environment.

Test:
- successful payment;
- failed payment;
- duplicate webhook;
- reordered webhook;
- invalid signature;
- expired entitlement;
- cancellation;
- lifetime entitlement;
- replayed event;
- server/client mismatch.

## 11. Model QA

Test:
- correct checksum;
- corrupted download;
- interrupted download;
- low disk space;
- failed install;
- rollback;
- unsupported platform;
- unsupported architecture;
- model removal while active;
- model switch.

## 12. Release QA

Fresh machine:
1. download artifact;
2. verify checksum;
3. install;
4. launch;
5. configure microphone;
6. configure hotkey;
7. dictate;
8. inject text;
9. close/reopen;
10. update;
11. uninstall if applicable.

## 13. TestSprite policy

TestSprite is a supplemental autonomous E2E/bug-finding system.

Run:
- after major UI feature;
- after auth/dashboard changes;
- after payment-adjacent changes;
- on release candidate;
- on significant diffs.

TestSprite results do not replace:
- unit tests;
- integration tests;
- security review;
- performance benchmarks;
- manual release checks.

## 14. Performance gate

Release candidate must include a reproducible benchmark report.

No performance claim may be written on the public website until measured on documented hardware.

## 15. Privacy gate

Verify:
- no raw audio network requests;
- no transcript analytics;
- no keystroke logging;
- no clipboard telemetry;
- logs contain no transcript/audio/secrets.

## 16. MCP gate

Before using a production-connected MCP:
- scope to correct project/account;
- use read-only mode where possible;
- restrict toolsets;
- verify authentication;
- inspect permissions;
- record server/source/version/date;
- do not expose customer data unnecessarily.

## 17. Handoff gate

Before an AI session ends:
- `STATUS.md` current;
- `NEXT.md` exact;
- tests status recorded;
- current branch/commit recorded;
- blockers listed;
- no secret values written into progress.
