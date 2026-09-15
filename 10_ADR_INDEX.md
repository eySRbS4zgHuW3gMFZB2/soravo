# 10 — ADR Index

Architecture decisions must be recorded when implementation differs materially from the documents.

Required ADRs:

- ADR-001 — Tauri v2 architecture
- ADR-002 — frontend stack: React + TypeScript + Tailwind + shadcn/ui
- ADR-003 — audio capture architecture
- ADR-004 — VAD strategy
- ADR-005 — Parakeet backend/model choice
- ADR-006 — Whisper fallback/backend
- ADR-007 — transcript stabilization strategy
- ADR-008 — text injection strategy
- ADR-009 — model distribution/source
- ADR-010 — Supabase schema and RLS
- ADR-011 — authentication/session model
- ADR-012 — Supabase entitlements authorization
- ADR-013 — Supabase devices/sessions authorization
- ADR-014 — Cloudflare hosting/deployment
- ADR-015 — Umami analytics boundaries
- ADR-016 — admin dashboard metrics
- ADR-017 — MCP toolchain and permissions
- ADR-018 — TestSprite testing policy
- ADR-019 — update/release mechanism
- ADR-020 — performance benchmark results
- ADR-021 — Linux support decision if revisited
- ADR-022 — Supabase admin role / authorization

Each ADR:
```text
# ADR-NNN — title

Status:
Date:
Context:
Decision:
Alternatives:
Security impact:
Performance impact:
Operational impact:
Testing impact:
Rollback:
Consequences:
```

Do not create an ADR for trivial implementation choices.

Do create one when changing:
- architecture;
- core inference backend;
- payment/auth design;
- data model/security boundary;
- deployment model;
- platform scope;
- privacy boundary.
