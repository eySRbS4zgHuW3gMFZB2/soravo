# T05-B — MEMORY ADR DECISION PACK (memory.rs unsafe FFI)

**Date:** 2026-09-28
**Status:** AWAITING HUMAN DECISION — no source, policy, manifest, CI, tray/i18n, Razorpay/MCP, or VCS action taken.
**Scope:** Decision-ready documentation only. This pack recommends no option and makes no product decision.
**Predecessor:** `T04-B-MEMORY-UNSAFE-FFI-REPORT.md` (investigation) + `T03-E-DESKTOP-COMPILER-RECOVERY-REPORT.md` §6 / blocker B2.
**Constraints honored:** unsafe code not removed; `unsafe_code = "forbid"` unchanged; no ADR created; `Cargo.toml` untouched; tray/i18n, CI, Razorpay/MCP untouched; nothing committed or pushed.

Sources inspected verbatim for this pack (no synthesis beyond them):

- `apps/desktop/src-tauri/src/memory.rs` (55 lines, full file)
- `apps/desktop/src-tauri/src/actions.rs:35-49` (`FinishGuard::drop` caller)
- `apps/desktop/src-tauri/src/main.rs` (full file — `init_allocator` absence check)
- `apps/desktop/src-tauri/src/lib.rs:23` (`pub mod memory`)
- `apps/desktop/src-tauri/Cargo.toml:67-72` (platform-gated `libc` dep)
- `Cargo.toml:25-27` (workspace lints)
- `Cargo.lock` (`libc 0.2.189`)
- `decisions/ADR-021-linux-support.md`, `decisions/ADR-026-handy-foundation.md`
- `Soravo_Engineering_Docs_v6/12_SECURITY_BASELINE.md:14`
- `T04-B-MEMORY-UNSAFE-FFI-REPORT.md`, `T03-E-DESKTOP-COMPILER-RECOVERY-REPORT.md`

---

## 1. Exact memory.rs implementation

File: `apps/desktop/src-tauri/src/memory.rs` (55 lines). Paraphrase-free structure:

- Module doc comment (lines 1-20): declares this is "glibc allocator tuning (Linux only)", describes transient dictation buffers (16 kHz PCM ~64 KB/s held twice + engine mel/FFT scratch ~80 KB/s), glibc dynamic-mmap-threshold failure mode, and states both entry points are no-ops on non-glibc targets.
- `init_allocator()` — Linux-glibc gated (line 28: `#[cfg(all(target_os = "linux", target_env = "gnu"))]`, lines 29-35); no-op stub on all other targets (lines 37-38: `#[cfg(not(...))]` + empty body). Doc comment (lines 22-27): "Must run before the workload allocates (called at the top of `run()`)".
- `trim_freed_memory()` — Linux-glibc gated (line 45, lines 46-52); no-op stub otherwise (lines 54-55). Doc comment (lines 40-44): "Called once per finished transcription pipeline (see `FinishGuard`) … off the main thread … order of a millisecond".
- Declared in `apps/desktop/src-tauri/src/lib.rs:23` as `pub mod memory;` (unconditional module declaration; per-function cfg selects the body).
- Dependency: `apps/desktop/src-tauri/Cargo.toml:71-72`:
  ```toml
  [target.'cfg(all(target_os = "linux", target_env = "gnu"))'.dependencies]
  libc = "0.2"
  ```
  Resolved to `libc 0.2.189` in `Cargo.lock`. No other file in the workspace declares `libc`.

Wiring state as found (verified by workspace grep for `init_allocator|trim_freed_memory|memory::`):

| Symbol | Caller | Status |
|---|---|---|
| `init_allocator()` | none found in tree | **Currently unwired / dead code.** `main.rs` (9-45) does not call it. T04-B's "called at the top of `run()`" describes intent (carried in the doc comment), not an existing call site. No `run()` function with such a call exists in the current `main.rs`/`lib.rs`. |
| `trim_freed_memory()` | `apps/desktop/src-tauri/src/actions.rs:47` inside `FinishGuard::drop` (lines 38-49) | **Live call path.** `FinishGuard` is constructed at `actions.rs:676` (`let _guard = FinishGuard(...)`) in the async transcription task; its `drop` also unloads the model and notifies the coordinator before calling `trim_freed_memory()`. Comment at lines 44-46 cites #1792. |

---

## 2. Exact unsafe operations

Two `unsafe` blocks; nothing else in `memory.rs` is unsafe. Both carry `// SAFETY:` comments quoted verbatim below.

| # | Location | Operation | SAFETY comment (verbatim) | Return value handling |
|---|---|---|---|---|
| U1 | `memory.rs:32-34` in `init_allocator()` | `libc::mallopt(libc::M_MMAP_THRESHOLD, 128 * 1024)` — sets glibc mmap threshold to 128 KiB | `// SAFETY: FFI call with no memory arguments; mallopt only updates malloc's internal parameters.` | Return (`c_int`: 1 success / 0 failure) is **discarded**; no success check. |
| U2 | `memory.rs:49-51` in `trim_freed_memory()` | `libc::malloc_trim(0)` — asks glibc to release free top-of-heap / free pages via `madvise` | `// SAFETY: FFI call with no memory arguments; malloc_trim releases whole free pages back to the OS via madvise and is thread-safe.` | Return (`c_int`: 1 if memory released / 0 otherwise) is **discarded**; no success check. |

Why `unsafe` is unavoidable for these calls (Rust model, not a style choice):

- Both are `extern "C"` FFI into glibc. Every foreign-function call requires an `unsafe` block by language definition, even with only integer arguments and no raw pointers.
- `libc::mallopt` / `libc::malloc_trim` have no safe-Rust wrapper in `std` or in the `libc` crate itself; T04-B §5 records no safe equivalent found, and this pack's re-inspection confirms `std` exposes no `mallopt`/`malloc_trim` binding.
- The workspace lint is absolute:
  ```toml
  [workspace.lints.rust]
  unsafe_code = "forbid"
  unused_must_use = "deny"
  ```
  `forbid` (unlike `deny`) cannot be suppressed by `#[allow(unsafe_code)]` at module, function, or block level. Compiler output per T04-B §1: `error: usage of unsafe block is forbidden` at `memory.rs:32` and `memory.rs:49`. Any compilation of the Linux-glibc cfg variant therefore fails today; the non-glibc stub variant compiles (no `unsafe` tokens instantiated).

Narrowness facts relevant to safety review:

- No raw-pointer dereference, no `transmute`, no manual allocation, no `extern` block *definition* in this file — only two foreign *calls* with integer arguments (`c_int` param + value; pad arg `0`).
- Process-global side effect: both mutate glibc allocator state for the whole process (threshold parameter; heap trimming). `init_allocator` is order-sensitive by its own contract ("must run before the workload allocates") — a contract that is currently **unenforceable because there is no caller**.
- Declared cost envelopes come only from in-code comments: mmap/munmap round-trip per multi-MB buffer "negligible at dictation frequency" (U1); trim "on the order of a millisecond, off the main thread" (U2). No measurement artifact for either was found in-repo.

---

## 3. Platform / configuration guards

| Layer | Guard | Effect |
|---|---|---|
| Function bodies | `#[cfg(all(target_os = "linux", target_env = "gnu"))]` on both real implementations; complementary `#[cfg(not(all(target_os = "linux", target_env = "gnu")))]` empty stubs | Real FFI compiles **only** on Linux-glibc. Windows, macOS, musl-Linux (`target_env = "musl"`), and all other targets compile the no-op stubs. |
| Dependency | `[target.'cfg(all(target_os = "linux", target_env = "gnu"))'.dependencies] libc = "0.2"` | `libc` is linked only for Linux-glibc builds. Non-glibc builds do not pull the crate for this module. |
| Module declaration | Unconditional `pub mod memory` in `lib.rs:23` | Module always exists; cfg selects behavior, so cross-platform call sites (`actions.rs:47`, unconditional) compile everywhere. |
| Caller | `actions.rs:47` unconditional call to `trim_freed_memory()` | Safe on all platforms *iff* the module compiles: on non-glibc it resolves to the no-op stub. |
| `init_allocator` caller | None | Zero platform effect today on any target. |

Consequences:

- macOS / Windows builds (the V1 distribution targets per ADR-021) are **behaviorally unaffected** by either option in this pack: both functions are no-ops there regardless.
- The compile blocker fires **only** when the Linux-glibc cfg is evaluated — i.e., Linux CI/dev builds (`x86_64-unknown-linux-gnu`), which ADR-021 keeps as build-verification targets (AC-016). macOS/Windows CI legs do not instantiate the offending `unsafe` blocks.
- musl-Linux targets (if ever used) take the no-op path; the tuning would silently do nothing there under any option that keeps the current cfg.

Out-of-scope but recorded to prevent ADR-scope creep: the desktop crate contains **other** `unsafe` usage outside `memory.rs`, all cfg-gated away from Linux-glibc CI (verified by inspection, not modified): `apple_intelligence.rs` (Swift FFI, macOS-gated module per T03-E F6), `input.rs` macOS Carbon block, `autostart.rs` macOS `SMAppService` block, `overlay.rs` + `utils.rs` Windows `SetWindowPos` / `IsWow64Process2` blocks, `secure_input.rs` macOS `IsSecureEventInputEnabled`. T03-E §7 notes macOS builds will need their own ADR coverage for the Swift FFI. **This pack covers only the two `memory.rs` calls**; it grants no precedent for those files.

---

## 4. Why the tuning exists

Per the module doc comment (lines 1-20) and `actions.rs:44-47` comment, the tuning addresses **issue #1792** (glibc allocator behavior during dictation):

1. Each dictation allocates multi-MB transient buffers: captured 16 kHz PCM (~64 KB/s, held twice — transcription copy + history WAV copy) plus engine per-run mel/FFT scratch (~80 KB/s of audio). All are freed within seconds.
2. glibc `malloc` serves above-threshold allocations via private `mmap` (returned to the OS on free), but the threshold is **dynamic**: freeing an mmapped block raises it toward that block's size (up to ~32 MB per the comment).
3. After the first dictation, later large buffers therefore come from `malloc` arenas rather than `mmap`. Freed arena memory is cached for reuse; interleaved small live allocations pin the pages, so the OS never reclaims them.
4. Stated result: RSS grows by roughly the transient-buffer volume per dictation, is never touched again, and migrates to swap.

Mitigation design (two halves):

- `init_allocator()` (currently unwired): pin `M_MMAP_THRESHOLD` to 128 KB once at startup so transient buffers stay on the `mmap` path and return to the OS on free.
- `trim_freed_memory()` (live, per-transcription via `FinishGuard::drop`): sweep sub-threshold arena churn back to the OS after each pipeline run.

---

## 5. Evidence for the reported RSS problem

| Evidence | Strength | Limitation |
|---|---|---|
| `memory.rs:16-17` comment: "~15 MB retained per 2-minute dictation; pinning the threshold reduced that to ~0.5 MB" | Only quantified claim in-repo | **In-code assertion only.** No measurement script, benchmark log, profiler output, RSS trace, kernel version, glibc version, model/engine, audio length, or trial count accompanies it. Not independently reproducible from the repo. |
| `T04-B §§3-4` restatement of the mechanism + origin commits `842acdf9` (Handy migration) / `a156c8c9` (foundation integration) | Establishes provenance: tuning arrived with the Handy-derived foundation, not from a Soravo-side experiment | T04-B cites the same in-code numbers; it adds no new measurement. Git history search for `1792|mallopt|malloc_trim|allocator` returns only the foundation commits — no fix/measure commit, no linked upstream issue text in-repo. |
| Caller comment `actions.rs:44-46` | Confirms the *intent* is live on the per-transcription path | Repeats the claim; adds no data. |
| `init_allocator` wiring | **Negative evidence:** no caller exists, so the "15 MB → 0.5 MB" result (which the comment attributes to "pinning the threshold") cannot be produced by the current tree even if the FFI compiled. Only the `trim` half is active. | Undermines any claim that current code reproduces the documented improvement. |
| External validation | None in-repo | No `#[test]`, no benchmark harness target, no CI job measures RSS; `docs/` and PRD/TDD excerpts inspected contain no RSS acceptance threshold. |

Net assessment for decision-makers: the **mechanism description is plausible and internally consistent** (glibc dynamic-threshold behavior is well-documented upstream), but the **quantitative claim (15 MB → 0.5 MB) is single-source, unrepeatable from repo artifacts, and half-unwired**. A decision to keep the tuning would be preserving a *claimed* mitigation, not a *demonstrated* one in the current tree.

---

## 6. Whether the tuning is functionally required by the current product

Finding: **not demonstrated as functionally required** by the current V1 product definition. Four independent reasons, each sufficient to separate "performance mitigation" from "functional requirement":

1. **V1 platform scope excludes the only affected target.** ADR-021 (Accepted 2026-09-18): V1 distribution/support = macOS + Windows; Linux = "development and CI build target only … not shipped or supported for V1 end users." The tuning is a no-op on macOS/Windows by construction (§3). It therefore cannot be on any V1 release-acceptance path; at most it affects Linux dev-machine ergonomics and Linux CI leg compilability.
2. **Half the mitigation is dead code.** `init_allocator()` — the threshold pin the 0.5 MB claim depends on — has no caller. The product today cannot be "relying" on it. Only `trim_freed_memory()` executes, and its isolated contribution was never separately quantified in-repo.
3. **No product requirement references it.** No FR/AC/TDD acceptance found ties dictation correctness, latency, or memory to this tuning or to any RSS bound. Correctness (transcription output, paste, history) does not depend on allocator hints: removing them changes *when freed pages return to the OS*, not *whether buffers are freed*. The failure mode is gradual RSS retention / swap pressure over repeated dictations on glibc hosts — a resource-hygiene concern, not a functional break.
4. **Currently unverifiable either way.** The desktop crate does not compile on the affected cfg today (blockers B1 tray-locale + B2 unsafe), so no RSS before/after measurement can be taken without first resolving this decision. Any "required" verdict today would be speculative.

What this means for the options: Option A (remove) carries **no known functional regression** on V1 targets and an **unquantified** Linux-only hygiene regression; Option B (ADR exception) carries **no functional gain** on V1 targets and restores an **unquantified, half-wired** Linux-only mitigation at the cost of the first `unsafe` exception to the workspace policy.

---

## 7. Option A — Remove the tuning

Concrete source changes (descriptive, not applied):

- A1 (minimal): delete `apps/desktop/src-tauri/src/memory.rs`; remove `pub mod memory;` (`lib.rs:23`); remove the `crate::memory::trim_freed_memory();` statement plus its 4-line comment (`actions.rs:44-47`); remove the `[target.'cfg(all(target_os = "linux", target_env = "gnu"))'.dependencies] libc = "0.2"` block (`apps/desktop/src-tauri/Cargo.toml:71-72`) and let `Cargo.lock` drop `libc` from this crate's closure (lockfile regenerates via normal build; `libc` may remain via other deps' closures — verify, do not hand-edit).
- A2 (conservative variant, same review burden): keep the file as pure no-op stubs (delete both cfg-gated real bodies + `libc` dep, keep signatures so `actions.rs:47` still compiles). Preserves call-site churn surface for a future re-introduction at the cost of dead API surface. Decision-makers must pick A1 or A2; they are mutually exclusive.
- Either variant touches 3-4 files, all listed above. No policy, manifest-version, CI, tray/i18n, or payment change.

| Dimension | Analysis |
|---|---|
| Safety | Eliminates the only `unsafe` in the Linux-glibc compile closure for this crate path. Workspace `unsafe_code = "forbid"` holds without exception; no new audit surface; `SAFETY:` comments and ignored-FFI-return concerns disappear with the code. Note: does **not** make the crate `unsafe`-free on other cfgs — macOS/Windows-gated `unsafe` blocks remain (out of scope, §3). |
| Runtime (Linux-glibc only; macOS/Windows identical) | `mallopt` pin gone (was already a no-op — no caller — so zero delta); per-transcription `malloc_trim` gone. Expected effect per the in-code model: sub-threshold arena churn accumulates; long dictation sessions on Linux dev machines retain more RSS and may pressure swap sooner. Magnitude **unquantified** in current tree (the 15 MB figure assumed both halves). No correctness change: buffers are still freed; only OS reclamation timing changes. Perceived risk is session-length-dependent (single short dictation: negligible; repeated long dictations without process restart: cumulative). |
| Platform | Unblocks the Linux-glibc compile leg for this blocker (B1 tray-locale still blocks independently). macOS/Windows artifacts byte-equivalent in behavior (stubs were already no-ops). musl-Linux unchanged (was already no-op). ADR-021 Linux dev/CI-only posture is unaffected. |
| Testing | (i) `cargo check -p soravo-desktop --all-targets` on `x86_64-unknown-linux-gnu` must show zero `unsafe`-forbid errors for this module path; (ii) `cargo test -p soravo-desktop` + workspace tests green (note: `actions.rs` has unit tests for helpers, none for `FinishGuard` — add or waive explicitly); (iii) multi-dictation RSS soak on a Linux-glibc host (e.g., N×2-min dictations, record `/usr/bin/time -v` MaxRSS or cgroup peak) to bound the accepted regression — define N and bound before merging; (iv) confirm macOS/Windows builds unaffected (existing CI legs). No new unsafe-audit test needed. |
| Rollback | Re-introduce the exact deleted hunk set (kept in the removing PR's diff) + `libc` dep; re-runs the same test list. If removal ships and Linux RSS proves painful pre-post-V1-Linux-milestone, rollback = re-open this decision pack and choose Option B instead (requires the ADR path, not a silent revert). |

---

## 8. Option B — Narrowly scoped ADR exception for the FFI

Concrete source/policy changes (descriptive, not applied):

- B-policy: new ADR (next free number; index currently lists up to ADR-026) titled e.g. "ADR-02x — Linux-glibc allocator-tuning FFI exception", Status `Proposed` → human-accepted. It must narrowly scope: exactly two call sites (`memory.rs:33` `mallopt(M_MMAP_THRESHOLD, 131072)`; `memory.rs:50` `malloc_trim(0)`), Linux-glibc cfg only, `libc 0.2` only, with the two existing `SAFETY` comments adopted as the audited rationale plus disposition of the ignored return values (assert-or-log vs. documented-ignore).
- B-code (required alongside, otherwise the exception changes nothing at runtime): either (B-a) wire `init_allocator()` into startup (`main.rs` before Tauri builder / `run`, ordering documented and tested — currently missing), or (B-b) explicitly scope the ADR to `trim` only and delete/mark-dead `init_allocator`. An ADR that blesses dead code without wiring it preserves policy debt for zero runtime benefit and must not be accepted silently — decision-makers must pick B-a or B-b.
- B-lint mechanics (pick one in the ADR; both need human sign-off because both touch policy enforcement): (i) keep workspace `forbid` and move these two functions into a **separate tiny crate** with its own `[lints] unsafe_code = "allow"` + `#![deny(...)]` hardening + pinned `libc`, depended on only under the same Linux-glibc cfg; or (ii) downgrade the workspace lint from `forbid` to `deny` with a crate-level `#[allow]` + justification. (i) is narrower; (ii) is broader and weakens the guarantee for the whole workspace. **Neither is applied by this pack.**
- No tray/i18n, CI-workflow, Razorpay/MCP, or feature change.

| Dimension | Analysis |
|---|---|
| Safety | Creates the **first accepted `unsafe` exception** to the "local unsafe Rust forbidden unless an explicit ADR changes policy" baseline (in force since foundation commit per ADR-026 note). Blast radius is small but nonzero: process-global allocator mutation; ignored FFI return codes (failure is silent — `mallopt` can return 0, `malloc_trim` can return 0 — so a future glibc change could silently disable the mitigation); `init_allocator` ordering obligation (B-a) with no compiler enforcement; precedent risk for the other cfg-gated `unsafe` files (§3) which would cite this ADR. Mitigations the ADR must mandate: exact-call-site allowlisting (no blanket module/file exception), `libc` version pin + `cargo audit`/`deny.toml` coverage, SAFETY-comment retention, return-value disposition, and a re-review trigger (libc major bump, glibc behavior change, or post-V1 Linux-support milestone). |
| Runtime (Linux-glibc only) | Restores the documented mitigation (fully only under B-a; `trim`-only under B-b). If the in-code numbers generalize, repeated-dictation RSS retention on Linux drops toward the claimed ~0.5 MB/dictation at the cost of an mmap/munmap round-trip per large buffer + ~ms-scale `malloc_trim` per transcription (both per existing comments; unmeasured in-repo). No effect on macOS/Windows. Risk if B-a wiring is wrong: calling `init_allocator` *after* workload allocation silently forfeits most of the benefit while appearing to fix it. |
| Platform | Linux-glibc leg compiles (after B1 resolved separately) and gains the tuning; all other targets unchanged (stubs). ADR-021 posture unchanged. musl builds still no-op — the ADR must state this explicitly so musl users do not assume coverage. |
| Testing | All of Option A's tests **plus**: (i) `cargo check` on Linux-glibc proves the exception path compiles *with* the narrowed allow (and that `cargo check` on other targets still sees no `unsafe`); (ii) startup-order test or assertion proving `init_allocator` runs before first large allocation (B-a) — e.g., integration test or logged once-guard; (iii) RSS soak before/after on identical Linux-glibc host + workload (same N, same model, same audio) demonstrating the claimed delta within a pre-declared tolerance, otherwise the ADR's performance premise fails; (iv) `malloc_trim` latency spot-check (assert p99 within stated ~ms envelope off the transcription hot path); (v) `cargo deny/audit` clean for the `libc` pin; (vi) negative test: non-glibc build contains no `mallopt`/`malloc_trim` symbols (e.g., `nm`/`strings` or cfg assertion). |
| Rollback | Two-layer: (1) code revert (unwire call + restore `forbid`-clean stubs, or drop the micro-crate) returns to Option-A state; (2) ADR status flip to `Superseded` with reason + date. Because `forbid→allow` mechanics touch policy, rollback must also verify no other code landed under the exception window (audit `git log` for `unsafe` additions between ADR accept and revert). |

---

## 9. Other evidence-supported options

### Option C — Glibc environment-variable tuning, no code / no `unsafe` (investigational)

- Content: instead of FFI, set the allocator from outside the process: `MALLOC_MMAP_THRESHOLD_=131072` (and optionally `MALLOC_TRIM_THRESHOLD_` / `MALLOC_MMAP_MAX_`) in the Linux dev/CI launch environment (shell wrapper, `.env`, systemd unit, or CI job env). glibc's allocator reads `MALLOC_*_` variables at startup; no Rust `unsafe`, no `libc` dep, no policy change. `malloc_trim` has no env equivalent, so this covers only the `mallopt` half; pair with either dropping `trim` (accept partial mitigation) or deferring `trim` to the post-V1 Linux milestone.
- Why it is evidence-*supported* (weakly): it uses the same documented glibc knob the code sets, without FFI; ADR-021 already confines Linux to dev/CI, where env control is practical (no end-user distribution to configure).
- Why it is **not** a drop-in: env vars must be present **before** the first allocation (same ordering caveat as B-a, now owed by the launcher not the code); they affect the whole process including libraries (broader than the two-call scope); Tauri-packaged launches that bypass the wrapper silently lose the tuning; interaction with `trim` removal is unmeasured; needs the same RSS soak as Option A/B to prove anything.
- Source changes: none in Rust (docs/launch-script/CI-env only — and CI scripts are explicitly out of scope for this pack, so this option can only be *described* here, not implemented).
- Safety: no `unsafe`, no policy exception, no precedent. Runtime/platform/testing/rollback mirror Option A (partial mitigation, Linux-only, soak-required; rollback = unset the env).

### Option D — Defer: keep the blocker blocked (do nothing now)

- Content: leave `memory.rs` as-is (still failing Linux-glibc compilation), record this pack as the decision input, and schedule the A-vs-B choice for the post-V1 Linux-support milestone (ADR-021's explicit revisit point). Meanwhile Linux CI/dev builds remain red on B2 (compounding with B1).
- When this is rational: if Linux dev ergonomics can tolerate the red leg (e.g., desktop iteration happens on macOS/Windows, Linux CI desktop leg is already non-gating or waived by a separate human call) and the team prefers not to pay either the RSS-acceptance analysis (A) or the policy-precedent cost (B) during V1.
- Cost to state plainly: this is **not free** — it prolongs a known-broken `main`-adjacent build leg, normalizes red CI, and risks bit-rot of the Linux path that ADR-021 claims to keep honest (AC-016). If chosen, the deferral needs an expiry (milestone + owner), otherwise it becomes silent acceptance of a broken leg.

### Considered and rejected (documented so they are not re-litigated without new evidence)

- R1 — Allocator swap (`jemalloc`/`mimalloc` crate): replaces audited-two-call FFI with a whole foreign allocator (itself `unsafe` internally), new supply-chain surface, new tuning/benchmark burden, and possible inference-engine interaction. No in-repo evidence it helps this workload; contradicts V1 scope discipline.
- R2 — `#[allow(unsafe_code)]` on the module/function: **mechanically ineffective** — `allow` cannot override workspace `forbid`. Listed in T04-B §5; confirmed by the lint semantics in §2.
- R3 — Env-var-only `trim` replacement: no env equivalent for `malloc_trim` exists; rejected as a complete alternative (partial only, see C).
- R4 — Silent policy weakening (`forbid`→`deny`/`allow` without an ADR, or deleting the lint): **forbidden** by the task rules and by the security baseline's "unless an explicit ADR" clause. Any such change without a human-accepted ADR is a policy violation, not an option.

---

## 10. Side-by-side comparison (for the decision meeting)

| | A — Remove tuning | B — Narrow ADR exception | C — Env-var tuning (investigational) | D — Defer |
|---|---|---|---|---|
| Policy impact | None; `forbid` holds | First `unsafe` exception; precedent must be contained | None | None now; issue persists |
| Linux compile (B2) | Unblocked (B1 remains) | Unblocked (B1 remains) | Unblocked (code deleted/stubbed; B1 remains) | Still blocked |
| V1 macOS/Windows behavior | Unchanged (were no-ops) | Unchanged | Unchanged | Unchanged |
| Linux RSS | Unquantified regression accepted | Claimed mitigation restored (prove via soak; B-a vs B-b matters) | Partial (threshold half only; unproven) | Unknown; unmeasurable until unblocked |
| Code churn | 3-4 files (A1) or stubs (A2) | ADR + wiring (B-a) or scoping (B-b) + lint mechanics | Docs/launch env only | None |
| Test burden | Smallest (check + tests + soak bound) | Largest (all of A + order proof + before/after soak + latency + symbol check + audit) | Like A + env-presence proof | None (debt accrues) |
| Rollback | Re-add diff (re-opens ADR question) | Code revert + ADR supersede + `unsafe`-window audit | Unset env | N/A (no change to roll back) |
| Fits ADR-021 (Linux dev/CI only) | Yes — matches "don't over-invest in Linux for V1" | Justifiable only if Linux dev pain is concrete and measured | Yes — cheapest Linux-only lever | Tensions with AC-016 honesty |

---

## 11. Recommendation

**None.** Per the tasking, this pack recommends no option and makes no product decision. The trade is between an unquantified Linux-only hygiene regression with zero policy cost (A), the first workspace `unsafe` precedent with a half-wired, unproven mitigation (B), an unproven env-var partial substitute (C), and carrying a red build leg (D). Resolving that trade requires product, security, and platform judgments that are outside an investigation mandate — see §12.

Matters the decision-makers must not outsource to assumption (all verified above):

1. `init_allocator()` is currently dead code — any decision premised on "the tuning works today" is false until B-a wiring or equivalent proof exists.
2. The 15 MB → 0.5 MB figures are single-source in-code claims with no measurement artifact.
3. Neither A nor B affects V1 macOS/Windows behavior; this is a Linux-dev/CI + policy-precedent decision, not a V1 ship-blocker (B1 tray-locale is the independent blocker either way).

---

## 12. Exact human approval required

No code, policy, manifest, CI, or release action under this pack may proceed without **all** of the following, recorded in writing (PR/ADR review or explicit sign-off comment — not an agent inference):

1. **Product owner decision — Option choice + variant.** State exactly one: `A1` (delete) or `A2` (stub), `B-a` (ADR + wire `init_allocator`) or `B-b` (ADR for `trim` only), `C` (env-var path with owner + soak plan), or `D` (defer with expiry milestone + owner). "Accept the tuning" or "just fix the build" is not an approvable instruction — the variant determines the diff and the test list.
2. **Security owner approval — required for B only; acknowledgment for A/C/D.** For B: accept the first `unsafe` exception, the exact two-call allowlist, the chosen lint mechanic (micro-crate vs. workspace `deny`), the ignored-return disposition, the `libc` pin + audit coverage, and the re-review triggers. For A/C/D: acknowledge the accepted Linux RSS posture (including the soak bound for A, or the red-leg expiry for D). Baseline citation: `12_SECURITY_BASELINE.md:14` ("local unsafe Rust forbidden unless an explicit ADR changes policy").
3. **ADR author/approver (for B only).** A numbered ADR in `decisions/` following the repo template (Status/Date/Context/Decision/Alternatives/Security/Performance/Operational/Testing/Rollback/Consequences), scoped per §8, reviewed and marked `Accepted` by whoever the project recognizes as ADR authority. This pack is **not** that ADR.
4. **Acceptance proof before merge (all options).** The §7/§8/§9 test list for the chosen option, with commands and outputs attached to the approving PR: Linux-glibc `cargo check` result, `cargo test` result, RSS soak numbers vs. the pre-declared bound (A/B/C), startup-order proof (B-a), and non-glibc unaffected confirmation. For D: the waived-leg record + expiry instead of test outputs.
5. **Out-of-scope confirmations.** Approver confirms: no change to `unsafe_code = "forbid"` beyond what the chosen variant states (nothing, for A/C/D); no tray/i18n, CI-workflow, Razorpay/MCP, or unrelated-file change rides along; no commit/push occurs until 1-4 are complete (this pack itself is uncommitted documentation).

Suggested approval record (copy into the deciding PR/issue):

```text
T05-B decision: <A1 | A2 | B-a | B-b | C | D>
Product owner: <name> — <date>
Security owner: <name> — <date> (approval for B / acknowledgment otherwise)
ADR: <number + Accepted date, or N/A for A/C/D>
Soak bound / defer expiry: <numbers + date, or waived with reason>
Test evidence: <links to check/test/soak outputs>
```

---

## Appendix — verification notes (read-only; nothing was executed that mutates policy or code)

- Full-file read of `memory.rs` (55 lines) and `main.rs` (45 lines); targeted reads of `actions.rs:35-49, 676`, `lib.rs:23`, both `Cargo.toml` lint/dep stanzas, `Cargo.lock` libc pin, ADR-021/ADR-026, security baseline, T04-B, T03-E.
- Workspace greps: `init_allocator` (3 hits: 2 definitions + 1 doc mention — confirming no caller); `memory::|mallopt|malloc_trim|1792` (28 hits — confirming single live caller at `actions.rs:47`); `unsafe` in `apps/desktop/src-tauri/src/*.rs` (25 hits — confirming broader cfg-gated debt per §3); `RSS|arena|swap|M_MMAP` (44 hits — confirming no measurement artifact beyond the in-code comment).
- Git: `git log --follow` on `memory.rs` shows only foundation commits (`842acdf9`, `a156c8c9`); issue/allocator keyword search shows no measurement commit. `git status` confirms pre-existing uncommitted worktree state, untouched by this pack.
- This pack adds exactly one file: `T05-B-MEMORY-ADR-DECISION-PACK.md`. It modifies no source, policy, manifest, workflow, locale, payment, or MCP surface.

*End of decision pack — STOP. Awaiting human decision per §12.*
