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

V1 HANDY-CORE PRESERVATION:
- Soravo V1 = wrapper/platform around Handy STT core (not rewrite)
- DO NOT modify Handy core STT behavior without explicit justification
- DO NOT add Soravo transcription post-processing layer (filler removal, normalization, punctuation rewriting)
- Implement at Soravo boundary when possible
- No duplicate STT stacks

Success requires install → configure → dictate → correct injection → account → entitlement/purchase → release artifacts → automated tests → benchmarked performance.

The full Soravo visual redesign is deferred until functionality, security, QA and release foundations are complete.
