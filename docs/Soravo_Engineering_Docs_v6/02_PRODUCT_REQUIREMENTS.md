# 02 — Product Requirements
Soravo is a professional local-first FOSS desktop dictation application. Audio and STT remain local; the product is not cloud STT, meeting intelligence, RAG, collaboration, mobile, or a general AI assistant.

V1:
- Tauri v2 + React/TypeScript + Rust + shadcn/ui/Tailwind.
- macOS/Windows primary; Linux remains optional/development unless ADR changes scope.
- Hold-to-talk and toggle-to-talk; configurable shortcut; warmed capture.
- Real-time-safe bounded audio pipeline; pre-roll target ~300 ms; VAD controls recognition work, not capture.
- Local Parakeet/Whisper-family candidates; engine selection by benchmark, licensing, latency, resources and packaging.
- Tentative/committed/final transcript semantics; tentative text is never injected.
- Reliable native insertion/clipboard fallback.
- Verified model metadata, checksums, provenance and license.
- Website: landing, features, pricing, download, FAQ, support, legal, login, account, admin.
- Supabase Auth/Postgres/RLS.
- Razorpay server-controlled payments.
- Customer entitlement/device/session dashboard and owner-only admin.
- No audio/transcript/keystroke/clipboard telemetry.

Success requires install → configure → dictate → correct injection → account → entitlement/purchase → release artifacts → automated tests → benchmarked performance.

The full Soravo visual redesign is deferred until functionality, security, QA and release foundations are complete.

## Product direction (deterministic)

Soravo is a Soravo-branded fork of Handy, retaining the appropriate Handy-derived local desktop/dictation foundation while adding Soravo-owned accounts, cloud services, entitlements, subscriptions, payments, and product infrastructure.

- The Handy-derived foundation covers: local desktop application foundation, dictation/STT functionality, audio capture and processing, local transcription pipeline, tray/application infrastructure, and other appropriate local functionality already present in the fork. Retention is conditional: existing code remains subject to license, provenance, compatibility, security, and product review per `04_HANDY_FORK_AND_REUSE_POLICY.md` and `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`. No claim is made that every current Handy feature is automatically retained.
- The Soravo-owned product layer covers: Soravo branding, visual identity and UI, Soravo accounts, authentication/session management, user identity, Soravo cloud, cloud-backed user data, entitlement state (Soravo entitlement system), subscription state, product catalog, payment integration (Soravo payment system; Razorpay is the current provider, see `06_WEB_CLOUD_PAYMENT.md`), license/entitlement synchronization, the Soravo website, Soravo-specific operational infrastructure, and Soravo-specific security/privacy controls.
- Status treatment: capabilities in this section are requirements. Each capability is PLANNED until it satisfies the evidence vocabulary in `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` (`IMPLEMENTED` / `VERIFIED` / `DEPLOYED` / `E2E VERIFIED`). A requirement must never be read as an implementation claim.

## Primary product objective (priority order)

1. Preserve/recover the Handy-derived desktop foundation.
2. Make the desktop application buildable and testable.
3. Apply Soravo branding/design (product-identity rebrand per T09; the full `DESIGN.md` visual redesign remains Phase 8 per `07_IMPLEMENTATION_PLAN.md` and ADR-010).
4. Integrate Soravo accounts.
5. Integrate Soravo cloud functionality.
6. Integrate entitlements/subscriptions (Soravo entitlement system).
7. Integrate payment infrastructure (Soravo payment system).
8. Establish reliable synchronization between desktop, Soravo cloud, entitlement, and payment state.
9. Maintain reproducible builds, licensing provenance, security, CI and release controls.

This ordering states product priority, not engineering execution order. Execution order and engineering gates remain governed by `07_IMPLEMENTATION_PLAN.md` and `08_TASK_BREAKDOWN.md`; priority never permits skipping an engineering gate.

## Platform priority (V1)

Windows and macOS are the V1 priority platforms. Linux remains optional/development unless an ADR changes scope. Linux-specific functionality must not block V1 unless the authoritative requirements explicitly make it a V1 requirement (Linux-specific code remains isolated per T05).
