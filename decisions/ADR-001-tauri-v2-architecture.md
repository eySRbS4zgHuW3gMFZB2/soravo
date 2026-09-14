# ADR-001 — Tauri v2 architecture

Status: Accepted
Date: 2026-09-14

Context: Soravo requires a local-first desktop application for macOS and Windows with a React/TypeScript frontend and a Rust core.

Decision: Use Tauri v2 with a Vite-built React/TypeScript SPA. Native operations are exposed only through narrowly scoped, typed Rust commands and runtime events; frontend state is not authoritative for audio or transcription sessions.

Alternatives: Electron; a native-only UI; a browser-only application.

Security impact: Tauri capabilities stay deny-by-default. No arbitrary shell, filesystem, or HTTP access is granted.

Performance impact: A native Rust core supports real-time audio and local inference without placing those workloads on the UI thread.

Operational impact: macOS and Windows packaging is deferred to the release phase; the current Linux environment is only for development validation.

Testing impact: Rust command tests and frontend contract tests are required before enabling audio, hotkeys, or text injection.

Rollback: Replace only through a new ADR and migration plan; no product code depends on a broad Tauri plugin surface.

Consequences: Desktop work proceeds in the Tauri v2 package, while website and payment server remain separately deployable.
