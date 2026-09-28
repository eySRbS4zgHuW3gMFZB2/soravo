# RAZORPAY-MCP-SETUP-002-REPORT.md

**Task**: RAZORPAY-MCP-SETUP-002 — Configure official TEST-only Razorpay MCP
**Status**: CONFIGURED (pending credentials) — verification BLOCKED, no live call made
**Created**: 2026-09-28
**OpenCode**: v1.18.31

Secret states below are reported as EXISTS/MISSING only. No credential values
appear in this report, in configuration, or in the repository.

---

## 1. Pre-modification confirmations

| # | Check | Result |
|---|-------|--------|
| 1 | Official package/server from prior audit | CONFIRMED, with one correction (see §2) |
| 2 | Exact config syntax for installed OpenCode (v1.18.31) | CONFIRMED via official OpenCode MCP docs |
| 3 | stdio via npx supported | CONFIRMED (general mechanism; not used — see §3) |
| 4 | Server restrictable to TEST credentials | CONFIRMED (per-mode API keys) |
| 5 | Read-only operation available | CONFIRMED (all `fetch_*` tools are pure reads) |
| 6 | Mutation-capable tools identified | CONFIRMED (see §9) |

## 2. Official server identity (with correction to 001-PLAN)

- Official server: **razorpay/razorpay-mcp-server** (public GitHub repo,
  "Razorpay's Official MCP Server"). Verified via `gh repo view`.
- Official docs: https://razorpay.com/docs/mcp-server/ (About, Remote setup,
  Configuration, Tools Reference, Cursor integration pages all read).
- **Correction**: RAZORPAY-MCP-SETUP-001-PLAN.md §B/`F` proposes
  `npx -y @razorpay/razorpay-mcp-server`. That npm package **does not exist**
  (`npm view` returns 404). The official distribution is:
  - **Remote (recommended)**: hosted Streamable-HTTP endpoint
    `https://mcp.razorpay.com/mcp` (legacy `/sse` deprecated 2025-08-13),
    reached via the `mcp-remote` bridge (`mcp-remote@0.14.3` verified on npm);
  - **Local**: self-hosted via **Docker** (unavailable on this host), not npx.
- Remote auth: `Authorization: Basic <base64(KEY_ID:KEY_SECRET)>` merchant
  token, or OAuth. Local auth: `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` env,
  with optional `READ_ONLY=true` and `TOOLSETS` restriction (Local-only flags;
  the Remote server has no server-side read-only switch — TEST scoping is done
  via the key pair).

## 3. Configuration applied

- **Configuration location**: `/home/maya/.config/opencode/opencode.json`
  (global OpenCode config; written via the supported `opencode mcp add`
  command — no hand-editing, no secrets written).
- **Server name**: `razorpay`
- **Transport**: `remote` (official recommended deployment; avoids the
  nonexistent npm package and the unavailable Docker path).
- **Entry**:
  - `type`: `remote`
  - `url`: `https://mcp.razorpay.com/mcp`
  - `headers.Authorization`: `{env:RAZORPAY_MCP_AUTH_HEADER}` (placeholder
    only — resolves from the host secret environment at runtime)
- **Enabled/disabled state**: ENABLED in config (`enabled` not set false;
  `mcp list` shows the server). Effective state is **dormant-pending-creds**:
  it reports `needs authentication` and performs no calls.
- **Credential storage**: OpenCode `{env:}` interpolation (same mechanism as
  the existing TestSprite entry). Nothing secret stored in any file or in git.

## 4. Discovery / list verification

`opencode mcp list` output (2026-09-28):

- `razorpay → needs authentication (https://mcp.razorpay.com/mcp)` — APPEARS ✅
- github → failed (pre-existing OAuth/DCR issue, unrelated)
- supabase → connected, cloudflare → connected, testsprite → connected
  (all pre-existing, unchanged)

## 5. Initialization verification

`opencode mcp debug razorpay` (connectivity probe only, no credentials sent):

- Endpoint reachable; HTTP 401 with OAuth resource metadata
  (`Bearer resource_metadata=.../.well-known/oauth-protected-resource`).
- **Discovered state**: DISCOVERED (DNS/TLS/HTTP + MCP endpoint identity OK).
- **Authentication state**: NOT AUTHENTICATED — `RAZORPAY_MCP_AUTH_HEADER`,
  `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` are all MISSING from the host
  environment. No TEST credentials exist to configure.
- **Server init**: NOT INITIALIZED (expected without credentials).
- `opencode mcp auth razorpay` (OAuth browser flow) was deliberately NOT run:
  binding an account is a human-escalation step per doc 15 and could link a
  non-TEST identity.

## 6. Read-only verification result

**NOT PERFORMED — BLOCKED** (no credentials, per §5).

- Intended harmless call (once TEST creds exist): `fetch_all_orders` with a
  minimal page size, or `fetch_all_settlements` — both pure reads.
- No order created, no payment captured, no refund issued, no provider state
  modified. No mutation tool was invoked, listed tools were only read from docs.

## 7. TEST-mode verification

**BLOCKED** (depends on §6). TEST scoping procedure for the human step (§10):

1. Generate a TEST key pair in the Razorpay Dashboard (Key ID begins with
   `rzp_test_`; never use a `rzp_live_*` key).
2. Derive the header locally: `echo KEY_ID:KEY_SECRET | base64`, export
   `RAZORPAY_MCP_AUTH_HEADER="Basic <token>"` in the host secret environment.
3. Restart OpenCode, re-run `opencode mcp list` (expect `connected`), then run
   the single read-only call and confirm returned objects belong to the TEST
   environment before any further use.

## 8. Doc-11 verification rule verdict

Per `11_MCP_AND_AGENT_TOOLING.md` (discovery ✅ / auth ❌ / read ❌ /
account-match ❌): Razorpay MCP status = **BLOCKED** (documents as UNKNOWN or
BLOCKED; BLOCKED is the precise term — the path forward is known).

## 9. Available mutation capabilities (from official Tools Reference)

Remote-supported mutation tools (i.e. exposed once authenticated):

- `capture_payment`, `update_payment`
- `create_payment_link`, `create_payment_link_upi`, `send_payment_link`,
  `update_payment_link`
- `create_order`, `update_order`, `update_refund`
- `create_qr_code`
- Helpers: `detect_stack`, `integrate_razorpay_checkout` (codegen, no charge)

Local-only (NOT exposed via this Remote configuration): `create_refund`,
`close_qr_code`, `create_instant_settlement`. **Refunds cannot be created
through the configured Remote server** — noted as a residual guardrail, not a
substitute for process controls.

Safe read-only tools: all `fetch_*` / `fetch_all_*` (payments, orders, payment
links, refunds, QR codes, settlements, instant settlements, payouts).

No per-tool allowlist was configured: OpenCode v1.18.31 local/remote MCP
syntax supports `enabled`, not tool-level gating (global `tools:` globs exist
but were left untouched to avoid changing unrelated agent behavior).
Mutation discipline therefore rests on: TEST-only credentials + human approval
for any `create/capture/update/send` call + never invoking them during setup.

## 10. Human follow-up (credential escalation, per doc 15)

1. Create/generate **TEST-only** Razorpay API keys (`rzp_test_*`).
2. Export `RAZORPAY_MCP_AUTH_HEADER` (Basic merchant token) in the host
   secret environment — do NOT paste values to the agent, files, or chat.
3. Restart OpenCode; confirm `opencode mcp list` shows razorpay `connected`.
4. Agent then performs the ONE deferred read-only call (§6) and records
   TEST-mode evidence here.

## 11. Security considerations

- No credential values in config, repo, docs, prompts, or this report.
- No files containing secrets created; nothing added to the repository except
  this report (config change lives outside git in `~/.config`).
- TEST-only by construction once creds exist; LIVE keys must never be exported
  under these variable names on a dev host.
- Context-budget note (doc 11): the `razorpay` catalog adds ~40 tools once
  connected; consider `tools: {"razorpay_*": false}` globally with per-agent
  enablement if context pressure appears — left for a later task, not done here.
- Pre-existing `github` MCP failure observed; unrelated, no action taken.

---

**Git status**: not committed, not pushed (per instruction). Config change is
outside the repository; the only repo artifact is this report.
