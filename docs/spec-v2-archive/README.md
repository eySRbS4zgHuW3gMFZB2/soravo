# Soravo Engineering Specification v2

> Working product name: **Soravo**. The name is a placeholder until the owner confirms the final brand.

This repository specification is the authoritative engineering handoff for an AI coding agent building a professional, local-first, proprietary speech-to-text desktop application.

## Document order

1. `01_PRD.md` — product requirements and scope
2. `02_TDD.md` — technical design and architecture
3. `03_AI_INSTRUCTIONS.md` — deterministic rules for AI coding agents
4. `04_IMPLEMENTATION_PLAN.md` — phased build order and dependencies
5. `05_TASK_BREAKDOWN.md` — atomic implementation tasks
6. `06_DOD_QA.md` — definition of done, testing and release gates
7. `07_AI_SKILLS.md` — exact skills.sh skills and usage policy
8. `08_MCP_AND_AGENT_TOOLING.md` — GitHub/Supabase/Cloudflare/TestSprite MCP and CLI policy
9. `09_SECURITY_BASELINE.md` — application, database, web, desktop and AI-agent security baseline
10. `10_ADR_INDEX.md` — required architecture-decision records and decision rules
11. `11_INTERRUPTION_HANDOFF.md` — deterministic recovery when an AI agent stops midway
12. `12_BENCHMARK_PROTOCOL.md` — STT performance/quality benchmark protocol
13. `13_RELEASE_RUNBOOK.md` — build, signing, release and rollback procedure
14. `14_ENVIRONMENT_AND_SECRETS.md` — development environment and secret-handling rules
15. `SORAVO_HANDY_CODE_REUSE_REPORT.md` — Handy V1 reuse strategy (authoritative)

## Authority

Security/safety > this AI instruction set > ADRs > TDD > PRD > implementation plan > task files > agent preference.

If two documents conflict, the higher-authority document wins. The agent must record the conflict in `progress/` and fix the lower-authority document rather than silently choosing.

## Handy Reuse First (mandatory)

Soravo V1 desktop application is built on Handy (MIT). Before implementing any feature that may overlap with Handy functionality, agents MUST locate, inspect, and reuse the actual pinned Handy source code wherever technically and legally compatible. Reimplementing existing Handy functionality is not permitted without explicit justification. See `03_AI_INSTRUCTIONS.md` section 9 for the full policy and `SORAVO_HANDY_CODE_REUSE_REPORT.md` for the authoritative reuse strategy.

## Product principles

- Audio and transcription are local by default.
- No cloud STT.
- No audio/transcript/keystroke telemetry.
- Performance is a product feature.
- Parakeet is the primary fast-path candidate; Whisper is the fallback/accuracy path.
- Model/backend selection is benchmark-driven.
- The UI never owns inference or real-time audio processing.
- Only committed/final text may be injected into applications.
- The app must survive an interrupted AI coding session through explicit progress and checkpoint files.
- Website analytics use Umami and are limited to website behavior, never dictated content.
- Supabase stores account, entitlement, device/session and operational metadata, not audio or transcript history.
- Admin analytics are product/account metrics, separate from Umami.
- GitHub, Supabase, Cloudflare and TestSprite MCP are development/operations tools only; MCP is not part of the shipped application runtime.
- Handy (MIT) is the V1 desktop foundation. Reuse its implementation wherever practical; do not reimplement from scratch. See `03_AI_INSTRUCTIONS.md` section 9.

## Target

V1 targets macOS and Windows. Linux/AppImage is deferred unless explicitly promoted by an ADR.

## Commercial stack

- Website: Cloudflare-hosted
- Product auth/account/backend: Supabase
- Payments: Razorpay
- Desktop binary distribution: GitHub Releases
- Public model distribution: model-source abstraction, initially compatible with Hugging Face/official model hosts
- Website analytics: Umami
- No Cloudflare R2 dependency
