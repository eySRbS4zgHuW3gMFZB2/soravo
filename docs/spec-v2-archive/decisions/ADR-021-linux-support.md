# ADR-021 — Linux Support Scope for the V1 Desktop Application

Status: Accepted
Date: 2026-09-18

## Context

FR-008 (SHALL) states the app must support Windows, macOS, and Linux, and AC-016 requires CI builds to produce artifacts for all three targets. However, PRD §4.1 names macOS and Windows as the distribution targets and explicitly defers Linux. The desktop foundation is ported from Handy, which ships a Linux build using a patched WebKitGTK stack; the Soravo development environment is itself Linux (this repository's CI and local tooling run on Linux x86_64 with webkit2gtk-4.1).

TDD-tagged requirement HOTKEY-002 also notes that Linux global hotkeys are restricted under Wayland, which would materially degrade a core V1 feature on default Linux desktop sessions.

## Decision

For V1:

1. **Primary distribution targets are macOS and Windows.** Marketing, packaging, entitlements, and support are scoped to these two platforms.
2. **Linux is a development and CI build target only.** Linux CI produces the deb/rpm/AppImage artifacts required by AC-016 to keep FR-008's build verification honest, and local development runs on Linux, but Linux is not shipped or supported for V1 end users and will not be offered as a download in the release pages.
3. **Global hotkeys (FR-002) are verified on macOS and Windows.** On Linux development builds, global hotkey behavior over Wayland is a known limitation carried as a documented risk in HOTKEY-002; it is not a V1 release acceptance path.
4. **The V1 release gate keeps the phased targets list** — macOS first, then Windows — consistent with the release plan; Linux reaches supported status at a post-V1 milestone, revisited via a future ADR.

This resolution supersedes the ambiguity flagged in spec open question #1: FR-008's "support" is interpreted as a build/CI verification obligation for all three platforms plus a support obligation for macOS and Windows in V1.

## Alternatives Considered

1. **Ship Linux in V1** — Rejected. Adds support/QA surface across distros and desktop environments, and Wayland hotkey restrictions would ship a degraded core feature. Handy's Linux support depends on broader patched-webview maintenance.
2. **Drop Linux from CI (ignore AC-016)** — Rejected. CI must prove FR-008 buildability on all three targets; the artifacts are already produced by the foundation and cost little to keep.
3. **Linux dev + CI only (CHOSEN)** — Keeps AC-016 satisfied, keeps developer ergonomics on Linux, and avoids a premature support commitment.

## Security Impact

None added. Linux artifacts are validated in CI but are not signed/released distributions for V1.

## Performance Impact

None. Linux performance is not a V1 acceptance target.

## Operational Impact

- Release automation produces three archive families as CI artifacts, but only macOS and Windows installers are published.
- Support matrix documents Linux as "development/CI only" for V1.

## Testing Impact

- AC-016 CI builds continue to gate on Linux artifact production.
- Functional QA (hotkeys, text injection, model manager) is executed on macOS and Windows.

## Rollback

Promote Linux to a supported target at a post-V1 milestone with a revised ADR; nothing in this record precludes it.

## Consequences

- V1 scope stays credible: two supported platforms, all three proven in CI.
- Wayland/HOTKEY-002 risk is explicitly carried rather than silently shipped.
- Foundation effort (Phase 1 shell) does not over-invest in Linux packaging polish.