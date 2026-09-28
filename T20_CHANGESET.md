# T20 Changeset (CI Stabilization)

**Created:** 2026-09-28  
**Branch:** `t19/git-ci-stabilization`  
**Base:** `ede495b5` (HEAD)

---

## Summary

T20 performed Rust formatting (`cargo fmt --all`) and verified `pnpm lint` passes.

**Only 3 files contain PURE T20 formatting changes:**

| File | Change |
|------|--------|
| `apps/desktop/src-tauri/src/audio_toolkit/mod.rs` | Export reordering |
| `apps/desktop/src-tauri/src/audio_toolkit/vad/mod.rs` | Formatting |
| `apps/desktop/src-tauri/src/clipboard.rs` | Formatting |

---

## All Other Changes Are NOT T20

- `apps/desktop/src-tauri/src/account.rs` — T14 account integration (formatting mixed with semantics)
- `apps/desktop/src-tauri/src/main.rs` — T10 desktop integration
- `Cargo.lock`, `Cargo.toml` — T18/T19 dependency updates
- `docs/spec-v3/*` — Pre-T20 spec archive cleanup
- `apps/website/src/*` — T08 payment/website integration
- `apps/desktop/src-tauri/src/memory.rs` — Deleted in working tree (exists in HEAD)
- All untracked files — T02-T20 reports, audit artifacts, generated files

---

## Attribution Evidence

**T20 report:** `T20-GIT-CI-STABILIZATION-REPORT.md`  
**T19/T18 reports:** See worktree classification sections

---

## Safe Staging (If Committing T20 Only)

```bash
# Restore memory.rs from HEAD (it was deleted in working tree)
git checkout HEAD -- apps/desktop/src-tauri/src/memory.rs

# Stage only T20 formatting
git add apps/desktop/src-tauri/src/audio_toolkit/mod.rs
git add apps/desktop/src-tauri/src/audio_toolkit/vad/mod.rs
git add apps/desktop/src-tauri/src/clipboard.rs

# Verify
git diff --cached --check
git diff --cached

# Commit
git commit -m "T20: Rust formatting fixes for audio_toolkit"
```
