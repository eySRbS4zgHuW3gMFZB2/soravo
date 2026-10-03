# T04-B: memory.rs Unsafe FFI Blocker Investigation Report

**Date:** 2026-09-28  
**Reporter:** T04-B (Memory Unsafe FFI investigation)  
**Reference:** T03-E-DESKTOP-COMPILER-RECOVERY-REPORT.md (blocker B2)

---

## 1. Exact Compiler Error

The workspace enforces `unsafe_code = "forbid"` in `Cargo.toml`:

```toml
[workspace.lints.rust]
unsafe_code = "forbid"
unused_must_use = "deny"
```

**Result:** When compiling `apps/desktop/src-tauri/src/memory.rs`, the Rust compiler emits:

```
error: usage of `unsafe` block is forbidden
  --> apps/desktop/src-tauri/src/memory.rs:32:5
   |
32 |     unsafe {
   |     ^^^^^^

error: usage of `unsafe` block is forbidden
  --> apps/desktop/src-tauri/src/memory.rs:49:5
   |
49 |     unsafe {
   |     ^^^^^^
```

The `forbid` lint cannot be suppressed with `#[allow]` attributes.

---

## 2. Exact Unsafe Operations

Two unsafe FFI calls in `memory.rs` (lines 32-34 and 49-51):

| Line | Unsafe Operation | Purpose |
|------|------------------|---------|
| 33 | `libc::mallopt(libc::M_MMAP_THRESHOLD, 128 * 1024)` | Pin glibc's mmap threshold to 128 KB |
| 50 | `libc::malloc_trim(0)` | Return freed pages back to OS via madvise |

Both calls are guarded by `#[cfg(all(target_os = "linux", target_env = "gnu"))]` — they compile only on Linux glibc targets.

---

## 3. Architectural Purpose

The module addresses **issue #1792**: memory retention causing RSS growth during dictation.

**Problem:** glibc's malloc has a dynamic mmap threshold (~32 MB default). When large transient buffers are freed, the threshold rises to that block's size. Subsequent dictation allocations then use malloc arenas (not mmapped memory), and arena memory pinned by interleaved small allocations is never returned to the OS. Result: ~15 MB retained per 2-minute dictation, eventually migrating to swap.

**Solution:**
1. `init_allocator()` — Runs before workload allocation; pins mmap threshold at 128 KB so all transient buffers take the mmap path and return to OS immediately on free.
2. `trim_freed_memory()` — Called per `FinishGuard::drop()` (line 47 in `actions.rs`); sweeps smaller-than-threshold churn from arenas back to OS.

---

## 4. Historical/Repository Evidence

| Evidence | Location |
|----------|----------|
| Origin commit | `842acdf9` — Migrate to Handy desktop foundation (HANDY-MIGRATION-001) |
| Integration commit | `a156c8c9` — feat: integrate PR #55 Handy-derived desktop foundation (audit-008) |
| Caller site | `apps/desktop/src-tauri/src/actions.rs:47` — `crate::memory::trim_freed_memory()` |
| Security baseline | `docs/Soravo_Engineering_Docs_v6/12_SECURITY_BASELINE.md:14` — "local unsafe Rust forbidden unless an explicit ADR changes policy" |
| T03-E recovery report | `T03-E-DESKTOP-COMPILER-RECOVERY-REPORT.md:109` — explicit identification of this blocker |

---

## 5. Safe Alternatives Investigated

| Alternative | Status |
|-------------|--------|
| **Safe Rust API** | No equivalent exists. `mallopt` and `malloc_trim` are glibc-specific FFI calls with no safe Rust wrappers in the ecosystem. |
| **Feature-gated allow** | `#[allow]` cannot override `forbid` — the workspace lint is absolute. |
| **Dynamic linker** | No POSIX mechanism to set `M_MMAP_THRESHOLD` at process start without FFI. |
| **Memory allocator replacement** | Requires external crates (e.g., jemallocator) which themselves use unsafe internals and add dependency surface. |
| **Remove tuning code** | Would leave issue #1792 unaddressed; RSS growth per dictation documented in the codebase. |

---

## 6. Deterministic Implementation Status

**No deterministic safe implementation exists.**

The unsafe operations are:
- FFI calls to glibc's C runtime (inherently unsafe by design)
- Documented with `// SAFETY:` comments in the source
- Scoped to Linux glibc only via cfg-gating
- Required for product functionality (issue #1792 memory behavior)

---

## 7. Exact Changes (If Any)

**No source changes made.** The investigation confirms:
- The code is functionally correct and documented
- No safe replacement exists
- The security baseline explicitly requires an ADR for policy exceptions

---

## 8. Verification

Verification criteria (if decision permits ADR):
1. Compile succeeds on `x86_64-unknown-linux-gnu`
2. `trim_freed_memory()` continues to be invoked from `FinishGuard::drop()` (actions.rs:47)
3. Issue #1792 memory retention remains fixed (measure RSS before/after dictation)
4. macOS/Windows builds remain unaffected (cfg-gated code)

---

## 9. Explicit Human Decision Required

**This blocker requires a human decision.** Per the security baseline:

> "local unsafe Rust forbidden **unless an explicit ADR changes policy**"

**Options:**

1. **Create ADR for memory.rs exception**
   - Scope: Two specific FFI calls (`libc::mallopt`, `libc::malloc_trim`)
   - Platform: Linux glibc only
   - Rationale: Issue #1792 memory behavior; no safe alternative exists
   - Impact: Minimal; cfg-gated; reviewed with T03-E recovery report

2. **Remove allocator tuning**
   - Delete `memory.rs` module or disable calls
   - Impact: Issue #1792 unaddressed; ~15 MB retained per dictation

3. **Defer to product decision**
   - Document the memory behavior in PRD/spec
   - Decision: Accept retention or require fix

**Status:** AWAITING DECISION — no source modifications made.

---

*End of report*
