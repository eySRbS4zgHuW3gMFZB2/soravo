# FRESH-VM RECOVERY GUIDE (2026-10-10)

How to reconstruct a working SORAVO checkout on a clean machine after the
2026-10-10 recovery sync. No secrets are stored in this file — placeholders only.

## 1. What to clone (source of truth = GitHub `eySRbS4zgHuW3gMFZB2/soravo`)

```bash
git clone https://github.com/eySRbS4zgHuW3gMFZB2/soravo.git
cd soravo
git checkout main            # baseline; verify HEAD against the recovery report
```

## 2. Which branch has what (all pushed 2026-10-10, none merged except via PR review)

| Need | Branch / PR | Contents |
|---|---|---|
| Latest functional desktop (R1 auth + T22 live-test fixes, unmerged snapshot) | `recovery/r1-t22-worktree-2026-10-10` (base `18bc2133`) | Auth stack, deep-link/specta fixes. DO NOT MERGE without rebase + review |
| Benchmark harness + corpus (reviewed, CI green) | `t11b/gguf-benchmark-harness` → **PR #116** (OPEN) | Driver, fixtures, harness fix |
| Parakeet impl + gate-exception tests | `recovery/parakeet-2026-10-10` (base `17f34870`) | Test-only + 1 exception entry. Distribution NOT approved |
| All evidence reports + this guide | `recovery/evidence-2026-10-10` (`evidence/`) | 20 reports + 9 worktree notes |

To resume feature work: `git checkout -b <task>/<desc> recovery/r1-t22-worktree-2026-10-10`
(or `main` for clean tasks), then rebase onto current `main` only with owner direction
(the snapshot base was 22 behind `origin/main` at capture).

## 3. Machine assumptions

- OS/arch proven: Ubuntu 24.04 x86_64 (matches CI `ubuntu-24.04`). Other Linux: likely.
  macOS/Windows builds: UNKNOWN (never built here; see T33 ADRs for known alignment work).
- Disk: keep ≥10 GB free (Rust `target/` grows past 20 GB on full builds; model is 731 MB extra).

## 4. System packages (Ubuntu 24.04 — mirrors CI `rust` job)

```bash
sudo apt-get update && sudo apt-get install -y \
  libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev libasound2-dev libgraphene-1.0-dev \
  libgtk-4-dev libadwaita-1-dev libgtk-layer-shell-dev \
  libvulkan-dev glslc spirv-headers
```

## 5. Toolchains

- Rust: stable via `dtolnay/rust-toolchain` equivalent (`rustup default stable`; proven with 1.97.1).
- Node.js 22 + `pnpm@11.17.0` (`corepack enable; corepack prepare pnpm@11.17.0 --activate`).
- `pnpm install` at root; `cargo metadata --format-version 1` as a no-build sanity check.

## 6. First run order (cheap → expensive)

1. `cargo fmt --all -- --check` (seconds, no build).
2. `cargo test -p soravo-stt --test gguf_benchmark` (7 unit tests, no model, small build).
3. Full `cargo test --workspace` (heavy: C++/ORT deps; GBs of build).
4. Model tests (need 731 MB download first — see §8): `PARAKEET_MODEL_PATH=<path>
   LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs cargo test -p soravo-stt
   --test gguf_benchmark -- --ignored --nocapture`.
5. Desktop GUI: `LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs
   pnpm --filter @soravo/desktop tauri dev` (needs X11/Wayland + audio input for mic runs).
6. Web E2E: `pnpm e2e` (needs Playwright browsers: `pnpm e2e:install`).

## 7. Supabase / Razorpay / Cloudflare (manual — never in git)

- Supabase: `supabase/config.toml` + `supabase/migrations/` + `supabase/functions/` are in-repo.
  You must supply: project URL + anon key (local `.env`, never committed), service-role key
  (server/functions only), function secrets for webhooks. Run `supabase db reset` + `supabase functions deploy`
  per Supabase CLI docs; verify RLS tests (`pnpm test:supabase`) before any payment work.
- Razorpay: TEST `key_id` (`rzp_test_…`) + key secret from the Razorpay dashboard into env/function
  secrets only. Webhook secret likewise. LIVE is forbidden without business approval (runbook §17).
- Cloudflare Pages: website deploys from `main` via repo workflow; needs Cloudflare API token in CI/hosting
  settings, not in the repo.

## 8. Model setup (do NOT commit the file)

- Identity: `handy-computer/parakeet-unified-en-0.6b-gguf`, rev `7e948f21…`,
  `parakeet-unified-en-0.6b-Q8_0.gguf`, 731,357,568 B,
  SHA-256 `4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795`.
- Source: `https://huggingface.co/handy-computer/parakeet-unified-en-0.6b-gguf` (or let the app
  download it — it verifies SHA-256). Catalog license field says `cc-by-4.0`, but **commercial/
  redistribution/hosting clearance is BLOCKED** (T10 gate) — local test use only.
- Placement for local runs: `~/.local/share/com.soravo.desktop/models/` (app discovery dir), or pass
  `PARAKEET_MODEL_PATH` to harness tests.
- **Known fresh-clone gap:** `apps/desktop/src-tauri/resources/models/silero_vad_v4.onnx` is absent
  (R1 deletion state); dev runs here survived via a stale staged copy. A clean checkout CANNOT record
  until the Silero asset is restored (R1-GAP-008 decision). Expect `SileroVad` init failure otherwise.

## 9. What stays broken / limited (do not mistake recovery for readiness)

- CLI `--list-models` / `--transcribe-file` are parsed-but-ignored stubs (no handling code).
- Linux Escape-cancel is disabled by design; hotkey rebinding has no IPC/UI exposure.
- Benchmark evidence = 3 fixed clips (not representative); ONNX/streaming harness paths unrunnable.
- Checkout 500s on valid requests; zero TEST payments ever observed; CI-on-main status must be re-read live.
- UI redesign deferred (R6); final E2E QA (T15) not started; no release readiness claimed.

## 10. Resume protocol

Canonical specs: `docs/Soravo_Engineering_Docs_v6/` (NOT root `Soravo_Engineering_Docs_v6/` mirror, NOT
root `01–14` stale set). Task order: T34-Y R1→R5 sequence; evidence labels per doc 01. PROGRESS.md is
history, not authority — revalidate before reuse.

## 11. Verify-before-wipe checklist (old VM)

Only delete old VM data when: (a) the 3 recovery branches + PR #116 show the SHAs in the recovery
report; (b) a fresh clone passes §6 steps 1–2; (c) model SHA re-verifies from its new location;
(d) credentials/secrets are confirmed present in the NEW secret store (they were never in git).
