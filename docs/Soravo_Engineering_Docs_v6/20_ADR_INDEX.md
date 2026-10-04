# 20 — ADR Index
ADR-001 Local-first STT.
ADR-002 Tauri v2.
ADR-003 Supabase Auth/Postgres/RLS.
ADR-004 Razorpay.
ADR-005 Shared `@soravo/payment-domain`.
ADR-006 Handy-derived desktop foundation.
ADR-007 Soravo-owned session contract.
ADR-008 Soravo-owned transcript semantics.
ADR-009 No duplicate desktop stacks.
ADR-010 UI overhaul deferred until functional/release gates.
ADR-011 Model licensing gate.
ADR-012 Monthly cancellation semantics.
ADR-013 Durable Razorpay webhook idempotency.
ADR-014 Cloudflare Pages as established website hosting.
ADR-015 TestSprite as supplemental QA.
ADR-016 Documentation authority: GitHub implementation truth + this pack intent/control truth.
ADR-031 **ACCEPTED (owner-directed)** — Owner merge policy: the repository owner/primary maintainer may merge their own pull request when, and only when, every required automated check and repository-defined safety gate passes. Text: `T34-P-ADR-031-OWNER-MERGE-POLICY.md`. Owner-authorized 2026-10-04 by direct owner instruction. Supersedes nothing and amends nothing; the prior "second human approval on every PR" requirement existed **only** in GitHub branch protection (`required_approving_review_count: 1`, set by T23) plus historical task-report/`PROGRESS.md` logs — no canonical pack document ever mandated it. GitHub change is exactly one field, `required_approving_review_count: 1 → 0`; required status checks (`web`, `e2e`, `rust`, `desktop`), `strict`, `dismiss_stale_reviews`, force-push/deletion blocks and `enforce_admins` are all unchanged. Not weakened: required CI, security/audit checks, no force-push or history rewriting, no disabling required checks to obtain a merge, no merge with failing required checks, no fabricated or self-created review approval, no use of GitHub emergency "bypass rules"/admin override to work around a failing requirement. Security-sensitive and explicitly designated changes still require independent human review by a non-author and the agent must stop rather than merge; recorded limitation: GitHub branch protection cannot express a conditional review requirement, so that carve-out is procedural/agent-enforced, and the owner must grant a non-author reviewer access before such a change is authored. Production/release gates remain separate and unsatisfied by any merge. Governance text only — no CI job, workflow, secret, dependency or PR #64 change.

Create/update an ADR when:
- architecture changes;
- a Handy subsystem is replaced;
- duplicate implementations are retained;
- payment/provider semantics change;
- security boundaries change;
- auth/storage architecture changes;
- release architecture changes;
- major dependency strategy changes.
