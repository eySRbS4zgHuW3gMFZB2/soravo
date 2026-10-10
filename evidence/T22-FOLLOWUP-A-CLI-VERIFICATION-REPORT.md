# T22-FOLLOWUP-A — CLI DEEP-LINK VERIFICATION REPORT

**Date:** 2026-10-10 (session times UTC)
**Branch:** `feature/r1-gap-021-desktop-auth` — HEAD `18bc2133dc5805b24874dc4f16e64817437f91e9` (unchanged)
**Worktree status:** identical to T23 audit baseline plus the expected untracked T23 report; no other drift.
**Disk:** 9.8 GB free. No builds, no edits, no commits, no deletions (read-only task).
**Live session:** GUI PID 21872 + `tauri dev` watcher chain present before, during, and after (same PIDs) —
rechecked, undisturbed.

## 1. Binary identity (established, not assumed)

Tested binary: `target/debug/soravo-desktop` (mtime 12:38, **newer than both fixed sources** `main.rs` /
`soravo_ipc.rs` @ 12:32). Behavioral proof it contains both T22 fixes: the running instance's own log
shows the added `inject_text:` diagnostic and zero `EventRegistry` panics across 5 live runs.
`LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs` used (packaging rpath covers installed layout only).

## 2. Prior failure signature vs code reality

- Prior signature (per T22 task): Tauri-bootstrapped CLI commands panic with
  `tauri_plugin_deep_link` state accessed before `manage()`.
- Code finding (this session): **`--list-models` and `--transcribe-file` have NO handling code in this
  repository.** `cli.rs` parses them; `main.rs:40-41` comments exactly that ("no flag has handling code");
  repo-wide grep finds zero consumers (only macOS tray reads `no_tray`). So even absent the panic,
  these flags could never list or transcribe — they are parsed-and-ignored stubs.

## 3. Results (exact commands, exit 0 both, fixture untouched)

1. `LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs ./target/debug/soravo-desktop --list-models`
   → stdout: single arboard TRACE line. No model list. **No panic.**
2. `LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs ./target/debug/soravo-desktop --transcribe-file /tmp/opencode/mic-test.wav`
   (fixture: 160,044 B, 5 s 16 kHz mono speech recording from the T22 mic check — read-only use)
   → stdout: single arboard TRACE line. No transcription. **No panic.**
3. Interference: none — GUI PID unchanged, no shared-state writes (no transcription occurred, so no
   history/DB mutation path was reachable). Second-process output is consistent with single-instance
   forwarding-and-exit.

## 4. Classification

| Entry point | Verdict | Reason |
|---|---|---|
| `--list-models` | **INCONCLUSIVE** | Prior deep-link panic NOT reproduced (boot passes the fixed init), but the intended operation cannot complete — the flag is unimplemented. Neither VERIFIED nor FAILED per the category definitions. |
| `--transcribe-file` | **INCONCLUSIVE** | Same: no panic, no transcription; flag parsed and ignored by design-as-built. |

CLI vs GUI distinction: the GUI boot path is fixed and live-verified; the CLI shares that boot code
(no panic observed on either invocation), but **CLI file transcription as a capability does not exist**,
so GUI success says nothing about CLI benchmark usability.

## 5. T11 planning impact

**Not cleared.** A reproducible file-based benchmark cannot use this CLI — there is no operation to invoke.
Two paths: (a) implement `--transcribe-file`/`--list-models` handling (new code: headless model load +
batch transcribe + stdout/JSONK output; needs its own scoped task, NOT done here); or (b) benchmark via
the verified GUI path with fixed audio (inexact, operator-dependent). Recommending (b)-first is rejected:
unreproducible by construction. The prerequisite decision belongs to the owner.

## 6. Limitations

- Both invocations ran while the GUI held the single instance; a cold (no running instance) CLI boot was
  not tested — second-process behavior may differ, though the fixed registration executes in both cases.
- Exit codes observed 0 via clean tool return (no numeric echo captured — recorded as observed-clean-exit).
- `--list-devices`, `--repeat`, `--json`, `--model` not exercised (no handling code exists for any of them).

## 7. Recommended next task (not started)

**T22-FOLLOWUP-B — GUI-driven prescribed-phrase accuracy + xed insertion (no code).**
Closes T22's two remaining NOT EXECUTED items with the verified-working path: user speaks the exact fox
sentence into xed, 2–3 runs, compare verbatim, record WER-adjacent honest diff (not a benchmark claim).
Needs: running app (present), mic, ~10 min of user time. Alternative (CLI implementation for T11
automation) is larger, needs scoping/owner direction, and is therefore second.
