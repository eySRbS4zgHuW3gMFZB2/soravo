# VM RECOVERY MISSION REPORT — FULL PROJECT SYNC 2026-10-10

**Mission:** make GitHub the source of truth so the dev VM can be wiped. Normal session, no Swarm.
No force-push, no reset/clean, no merges, no history rewrite, no behavior changes, no UI work.

## A. GitHub preservation summary

- Repo: `https://github.com/eySRbS4zgHuW3gMFZB2/soravo.git`. `origin/main` = `82ec2ecc` (re-verified).
- **NEW `recovery/r1-t22-worktree-2026-10-10` @ `3bc65eda`** (pushed, ls-remote VERIFIED):
  R1 desktop-auth work (PKCE/deep-link/keychain, website, supabase functions+migration, PROGRESS log)
  + T22 live-test fixes (deep-link plugin, specta mount, tripwires, inject log) + worktree deletions as
  found. 53 files. Marked DO NOT MERGE without rebase+review (base 22 behind main).
- **NEW `recovery/parakeet-2026-10-10` @ `cfcefb7c`** (pushed, VERIFIED): 6 parakeet-worktree files
  (gate-exception tests + 1 MODEL_LICENSES exception entry). Pushing preserves work; distribution NOT
  approved (T10 gate stays BLOCKED). No PR opened for it.
- **NEW `recovery/evidence-2026-10-10` @ `fcb2baed`** (pushed, VERIFIED): 20 evidence reports + 9
  worktree notes + `FRESH_VM_RECOVERY.md`. Secrets-grepped clean (placeholders only).
- **Existing:** `t11b/gguf-benchmark-harness` @ `21601c65` = PR #116 head (OPEN, MERGEABLE, full CI
  green as of 2026-10-10 verification). Untouched this mission (no new commits).
- Deliberately NOT pushed: 731 MB model, 338 MB dev-clean archive, `target/` caches, app-data
  (`~/.local/share/com.soravo.desktop`), `/tmp` mic residue, ancient phase1/type-001 deletion-deltas
  (stale bases — recorded, not publishable as branches), 3 stale worktree registrations (missing from
  disk; left unpruned). Main worktree now sits ON `recovery/r1-t22-worktree-2026-10-10` (files on disk
  unchanged; R1+T22 committed+pushed; stt/reports/model leftovers remain untracked in place).

## B. Verification results

| Check | Result | Evidence |
|---|---|---|
| Remote SHAs equal local commits (×3 new + t11b) | PASS | `git ls-remote` matches `3bc65eda`, `cfcefb7c`, `fcb2baed`, `21601c65` |
| Remote file contents (R1 source, guide, commit stats) | PASS | `git show origin/<branch>:<path>` ×3; parakeet report correctly absent there |
| Model/corpus pins unchanged | PASS | Re-hashed in prior session; untouched since (no writes to them) |
| T10/T11 side-branch reports found + archived | PASS | In evidence branch; archive SHA re-verified `76f87d09…` |
| Secrets in pushed content | PASS (none) | Greps over all 30 evidence files + R1 sources + guide: clean |
| Clean-checkout proof (detached worktree @ `fcb2baed`) | PASS | 21 files + guide present; `cargo metadata --no-deps` resolves 13 members |
| PR #116 CI green | PASS (verified pre-mission; merge NOT done — needs separate approval) | `gh run list`: CI + Security Audit success on head |
| Full rebuild / model re-download on fresh VM | NOT EXECUTED | Documented in guide; needs network + disk + secrets |

## C. Fresh-VM instructions (detail: `FRESH_VM_RECOVERY.md` on the evidence branch)

`git clone <repo> && git checkout main`; feature work from the table in §A;
Ubuntu 24.04 + listed apt packages; Rust stable; Node 22 + pnpm 11.17.0; `pnpm install`;
Supabase/Razorpay secrets from dashboards (never git); model re-download via catalog SHA
(`4b50b6dd…`, local-test use only); `cargo fmt --check` → unit tests → model tests → `tauri dev`.

## D. Manual requirements (GitHub cannot provide)

Supabase URL/anon/service-role keys; Razorpay TEST keys + webhook secret (LIVE forbidden);
Cloudflare token; macOS/Windows signing credentials; the 731 MB model bytes (re-downloadable);
Silero VAD asset restoration decision (fresh clones CANNOT record until R1-GAP-008 resolved);
any Bellingcat of local app-data (history/settings are machine-local by design).

## E. VM cleanup readiness: READY FOR REINSTALL — with two conditions

All necessary work is verified recoverable from GitHub branches above **provided**:
(1) the owner accepts the three recovery branches as the preservation record (no PRs required except
#116's normal review), and (2) credentials/secrets are confirmed present in their NEW homes (they were
never in git — reinstall wipes `~/.local/share`, keychains, and shell env). If either is unconfirmed for
your setup, treat this as NOT READY until checked. Nothing important remains only-on-VM except secrets,
the model bytes (re-downloadable), and regenerable build caches.
