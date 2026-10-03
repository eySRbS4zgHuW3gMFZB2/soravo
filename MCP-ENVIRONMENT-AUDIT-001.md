# MCP-ENVIRONMENT-AUDIT-001 — Project Tooling Verification (READ-ONLY)

Date observed: 2026-09-27/28 (system date 2026-09-27 UTC; host FS timestamps Sep 28 00:08).
Working directory: `/home/maya/Desktop/Soravo_Engineering_Specification_v2`
Mode: READ-ONLY. Nothing was installed, uninstalled, enabled, disabled, authenticated, or modified.
Secrets policy: no secrets, tokens, API keys, cookies, passwords, or credentials are printed below. Where a command emits a credential, only presence/length/masked form is recorded.

Spec context: `08_MCP_AND_AGENT_TOOLING.md` lists the preferred stack as GitHub MCP, Supabase MCP, Cloudflare MCP, TestSprite MCP (Razorpay is mentioned only under "never commit Razorpay secrets", not as an MCP server).

---

## 1. Exact command evidence

### 1.1 `opencode --version`
```
1.18.31
---EXIT:0
```

### 1.2 `opencode mcp list`
```
[opencode-swarm] running v7.184.5
┌  MCP Servers
│
●  ✗ github failed
│      Incompatible auth server: does not support dynamic client registration
│      https://api.githubcopilot.com/mcp/readonly
│
●  ✓ supabase connected
│      https://mcp.supabase.com/mcp?project_ref=zbzhlhoxblguepplqppw&features=docs%2Cdatabase%2Cdebugging%2Cdevelopment
│
●  ✓ cloudflare connected
│      https://mcp.cloudflare.com/mcp
│
●  ✓ testsprite connected
│      npx -y @testsprite/testsprite-mcp@latest
│
└  4 server(s)
---EXIT:0
```
Interpretation: 4 servers discovered (github, supabase, cloudflare, testsprite). No `razorpay` row. GitHub is discovered-but-failed; other three report `connected`.

### 1.3 `which gh` / `gh --version`
```
/home/maya/.local/bin/gh
gh version 2.100.0 (2026-09-03)
https://github.com/cli/cli/releases/tag/v2.100.0
---EXIT:0
```

### 1.4 `which supabase` / `supabase --version`
```
/home/maya/.nvm/versions/node/v22.23.1/bin/supabase
2.118.0
---EXIT:0
```

### 1.5 `gh auth status` (harmless read-only; token shown masked by gh itself)
```
github.com
  ✓ Logged in to github.com account eySRbS4zgHuW3gMFZB2 (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
---EXIT:0
```
Note: this proves GitHub CLI auth is functional even though the GitHub *MCP* server is failed (separate auth planes: gh CLI keyring token vs MCP OAuth dynamic-client-registration).

### 1.6 `opencode mcp debug github` (read-only diagnostic, no auth performed)
```
[opencode-swarm] running v7.184.5
┌  MCP OAuth Debug
│
●  Server: github
●  URL: https://api.githubcopilot.com/mcp/readonly
●  Auth status: ✗ not authenticated
│  HTTP response: 401 Unauthorized
●  WWW-Authenticate: Bearer error="invalid_request", error_description="No access token was provided in this request", resource_metadata="https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp/readonly"
●  Initial unauthenticated check returned 401, so this server requires OAuth
●  Testing OAuth flow (without completing authorization)...
■  Connection error: Incompatible auth server: does not support dynamic client registration
└  Debug complete
---EXIT:0
```

### 1.7 `opencode auth list` (provider credentials only, values redacted)
```
┌  Credentials ~/.local/share/opencode/auth.json
│
●  OpenRouter api
●  Google api
●  Cerebras api
●  Mistral api
●  Inception api
└  5 credentials
---EXIT:0
```
No MCP entries here (expected; MCP OAuth lives in `mcp-auth.json`).

### 1.8 Environment-variable name scan (names only, values never printed)
- Names matching `testsprite|razorpay|supabase|cloudflare|github|mcp`: only `TESTSPRITE_API_KEY` present.
- `TESTSPRITE_API_KEY` presence check: `SET (length 53, NOT printing value)`. No Razorpay env var name observed.
- No `RAZORPAY_*` variable name observed in the filtered scan.

### 1.9 Global npm packages (does a Razorpay MCP package exist?)
```
/home/maya/.nvm/versions/node/v22.23.1/lib
+-- bun@1.4.2
+-- corepack@0.34.6
+-- npm@10.9.8
+-- omniroute@3.8.50
+-- opencode-ai@1.18.31
+-- pnpm@11.17.0
`-- supabase@2.118.0
```
No Razorpay MCP package installed globally. npx cache (`~/.npm/_npx/`) contains only opaque hash dirs; no attributable Razorpay install evidence. `npx` present at `/home/maya/.nvm/versions/node/v22.23.1/bin/npx`, version 10.9.8.

### 1.10 Harmless read-only Supabase call from this session
`supabase_list_tables(schemas=["public"], verbose=false)` succeeded and returned 5 tables (`profiles`, `entitlements`, `devices`, `sessions`, `webhook_events` with row counts 2/3/0/0/17). This proves the Supabase data plane is reachable with read-only metadata; it is evidence for Supabase usability (via this harness's Supabase tooling, correlated with `opencode mcp list → connected`).

---

## 2. Configuration file inventory (applicable OpenCode MCP locations)

| Path | Exists | Holds MCP config? | Key-name-only evidence |
|---|---|---|---|
| `~/.config/opencode/opencode.jsonc` | YES | YES — authoritative MCP source | Top-level `mcp` with exactly 4 keys: `github`, `supabase`, `cloudflare`, `testsprite`. No `razorpay` key (verified via key-name grep; full sort-u list also contains only `API_KEY, cloudflare, command, enabled, environment, experimental, github, mcp, mcp_timeout, paths, skills, supabase, testsprite, type, url`). |
| `~/.config/opencode/opencode.json` | YES | NO | Contains `plugin` (opencode-swarm + omniroute) and `agent` blocks only. Key-name grep for `mcp/github/razorpay` returns zero hits. |
| `~/.config/opencode/opencode-swarm.json` | YES (global swarm/agent policy) | NO | Agent models, execution_mode, worktree, guardrails, gates, automation. `grep -c -i razorpay` → 0. |
| `<project>/.opencode/opencode-swarm.json` | YES | NO | Agent model overrides only (test_engineer, critics, curators). No `mcp` key (recursive grep for `"mcp"` in `.opencode/` hits only `node_modules/@opencode-ai/sdk` type definitions, not config). |
| `<project>/opencode.json`, `<project>/opencode.jsonc`, `<project>/.opencode.json*` | NO | N/A | `ls` confirms absent; therefore no project-level MCP override — global config applies. |
| `~/.local/share/opencode/mcp-auth.json` | YES (8711 bytes, mode 600) | YES — MCP OAuth store (key names only, values never read) | Key-name grep (sorted unique): `accessToken, clientId, clientIdIssuedAt, clientInfo, clientSecret, clientSecretExpiresAt, cloudflare, expiresAt, refreshToken, scope, serverUrl, supabase, tokens`. Case-insensitive name counts: `cloudflare`×1, `supabase`×1, `github`×0, `testsprite`×0, `razorpay`×0. So: OAuth material exists for supabase + cloudflare; none for github, testsprite (env-key instead), or razorpay. |
| `~/.local/share/opencode/auth.json` | YES (mode 600) | NO (provider keys only) | Key names: `cerebras, google, inception, key, mistral, openrouter, type`. No MCP data. |
| `~/.config/opencode/opencode.swarm-install-backup.json` | YES | NO | Key-name grep for `mcp/razorpay/github/supabase/cloudflare/testsprite` → zero hits. |

Recursive content search: `grep -rli "razorpay" ~/.config/opencode/` → no hits (exit 1). `grep -rli "razorpay" .opencode/` → no hits. Razorpay strings DO exist under `./supabase/tests/`, `./supabase/config.toml`, `./supabase/README.md`, `./supabase/.temp/smoke-027/` — these are project payment-integration code/tests, not MCP configuration, and were not inspected beyond filenames.

Effective resolution: global `opencode.jsonc` (`mcp` block) + `mcp-auth.json` (OAuth) + `TESTSPRITE_API_KEY` env var. No project-level override. No alternate profile file containing MCP config was found.

---

## 3. Per-server record

### github (GitHub MCP, official, hosted remote `/readonly`)
- Exact name: `github`
- Configuration source/path: `~/.config/opencode/opencode.jsonc` → `mcp.github` (`type: remote`, `url: https://api.githubcopilot.com/mcp/readonly`, `enabled: true`)
- Installed/configured: configured YES (remote URL needs no package install)
- Enabled/disabled: enabled (`enabled: true`)
- Discovered by OpenCode: YES — `opencode mcp list` shows `✗ github failed`
- Authentication state (safely observable): NOT authenticated — `opencode mcp debug github` reports `Auth status: ✗ not authenticated`; `mcp-auth.json` contains zero `github` key hits; unauthenticated probe → `401 Unauthorized`; OAuth flow test → `Incompatible auth server: does not support dynamic client registration`
- Project/account scope: read-only endpoint; OAuth consent would scope to signed-in GitHub user (per config comment); no active scope observable while unauthenticated
- Harmless read-only call: MCP call not possible (server failed). CLI fallback `gh auth status` succeeds (separate plane)
- Usable by this OpenCode session: NO (via MCP). CLI fallback usable.

### supabase (Supabase MCP, official, hosted remote)
- Exact name: `supabase`
- Configuration source/path: `~/.config/opencode/opencode.jsonc` → `mcp.supabase` (`type: remote`, `enabled: true`, `url: https://mcp.supabase.com/mcp?project_ref=zbzhlhoxblguepplqppw&features=docs%2Cdatabase%2Cdebugging%2Cdevelopment`)
- Installed/configured: configured YES
- Enabled/disabled: enabled
- Discovered by OpenCode: YES — `✓ supabase connected`
- Authentication state: OAuth material PRESENT (key-names-only: `supabase` entry exists in `mcp-auth.json`; values never read)
- Project/account scope (observable from URL, non-secret): project_ref `zbzhlhoxblguepplqppw`; feature groups `docs, database, debugging, development` (account, functions, branching, storage NOT enabled per config comment)
- Harmless read-only call: YES — `supabase_list_tables` returned 5 public tables (see §1.10)
- Usable by this OpenCode session: YES

### cloudflare (Cloudflare MCP, official Code Mode, hosted remote)
- Exact name: `cloudflare`
- Configuration source/path: `~/.config/opencode/opencode.jsonc` → `mcp.cloudflare` (`type: remote`, `url: https://mcp.cloudflare.com/mcp`, `enabled: true`)
- Installed/configured: configured YES
- Enabled/disabled: enabled
- Discovered by OpenCode: YES — `✓ cloudflare connected`
- Authentication state: OAuth material PRESENT (key-names-only: `cloudflare` entry exists in `mcp-auth.json`; values never read)
- Project/account scope: OAuth login scoped to the Cloudflare account that completed consent (per config comment); exact account not observable without privileged calls — not probed
- Harmless read-only call: not made from this audit session (no Cloudflare MCP tool in this harness; `connected` status from `opencode mcp list` is the evidence)
- Usable by this OpenCode session: YES (per OpenCode `connected` status + stored OAuth entry)

### testsprite (TestSprite MCP, official `@testsprite/testsprite-mcp`, local stdio)
- Exact name: `testsprite`
- Configuration source/path: `~/.config/opencode/opencode.jsonc` → `mcp.testsprite` (`type: local`, `command: [npx, -y, @testsprite/testsprite-mcp@latest]`, `enabled: true`, `environment.API_KEY: {env:TESTSPRITE_API_KEY}` — interpolation reference only, secret not stored in file)
- Installed/configured: configured YES; backing is `npx -y <package>@latest` (on-demand fetch, not a globally installed package — absent from `npm ls -g`, which is expected)
- Enabled/disabled: enabled
- Discovered by OpenCode: YES — `✓ testsprite connected`
- Authentication state: API key sourced ONLY from host env `TESTSPRITE_API_KEY` — observed SET (length 53, value withheld). No `testsprite` entry in `mcp-auth.json` (expected for env-key auth). `connected` implies the server process launched with the env key accepted at startup handshake
- Project/account scope: not observable from config (account bound to the API key; plan/quota not probed)
- Harmless read-only call: not made (any TestSprite plan/test call could consume quota or trigger cloud execution; `connected` status is the usability evidence)
- Usable by this OpenCode session: YES (per `connected`; server process launchable via npx)

### razorpay (Razorpay MCP — investigated, NOT FOUND)
- Exact name: none configured
- Configuration source/path: NONE FOUND (see §4)
- Installed/configured: NOT configured anywhere observable
- Enabled/disabled: N/A (nothing to enable)
- Discovered by OpenCode: NO (`mcp list` shows 4 servers; no razorpay row)
- Authentication state: no entry in `mcp-auth.json` (zero `razorpay` hits); no env var name observed
- Project/account scope: N/A
- Harmless read-only call: N/A (no server)
- Usable by this OpenCode session: NO

---

## 4. Razorpay-specific investigation (A–J)

A. **Is Razorpay MCP actually configured?** NO — zero hits in `opencode.jsonc` (`mcp` keys are exactly github/supabase/cloudflare/testsprite), zero hits in `opencode.json`, zero hits in project `.opencode/`, zero hits in recursive `grep -rli razorpay ~/.config/opencode/`, zero hits in `mcp-auth.json`.
B. **Where is its configuration stored?** NOWHERE observable. The canonical location would be `~/.config/opencode/opencode.jsonc` → `mcp.razorpay` plus optionally an OAuth entry in `~/.local/share/opencode/mcp-auth.json` — neither exists.
C. **Is it enabled?** N/A — not configured, so there is no `enabled` flag to evaluate. Effectively not enabled.
D. **Does `opencode mcp list` discover it?** NO — output lists exactly 4 servers; no razorpay row, no associated error.
E. **Does OpenCode report an initialization error?** NO for Razorpay (nothing to initialize). The only init error in the listing belongs to `github` (`Incompatible auth server: does not support dynamic client registration`).
F. **Is authentication missing?** There is no `razorpay` auth entry in `mcp-auth.json` and no `RAZORPAY_*` env name observed — but absence of auth is a consequence of absence of configuration, not the root cause of invisibility. Even with auth present, an unconfigured server would not appear.
G. **Is it configured globally but not in this project?** NO — it is not configured globally either (global `opencode.jsonc` has no razorpay key), and there is no project-level MCP config at all, so no global-vs-project shadowing is involved.
H. **Is it configured for a different OpenCode profile/configuration?** NO EVIDENCE — the only other config-shaped files checked (`opencode.json`, `opencode-swarm.json` global + project, `opencode.swarm-install-backup.json`) contain no `mcp`/`razorpay` keys. No alternate profile dir was found. A GUI-side profile selector could exist outside these paths, but no filesystem evidence supports it.
I. **Is the server process/package actually installed?** NO EVIDENCE of install — `npm ls -g` shows no Razorpay MCP package; no `razorpay` string anywhere under `~/.config/opencode/` or `.opencode/`; npx-cache hashes are opaque and unattributable. (Deliberately did not attempt install/probe.)
J. **Does the GUI merely omit it while the CLI still discovers it?** NO — the CLI definitively does not discover it either (`mcp list` → 4 servers, none Razorpay). Whatever the GUI shows, this is not a GUI-only omission; the server is absent at the config/discovery layer. GUI state itself was not inspected from this CLI-only session.

Net: belief "installed recently" is not corroborated by any observable config, auth store, package list, or discovery output. Most likely explanations (unverified, no action taken): installation targeted a different machine/profile, was never persisted to `opencode.jsonc`, or was rolled back. To make it appear, a config entry would need to be added — explicitly OUT OF SCOPE for this read-only audit.

---

## 5. Final matrix

| MCP | Installed | Configured | Enabled | Discovered | Authenticated | Usable | Evidence |
|---|---|---|---|---|---|---|---|
| github | N/A (remote URL, no package) | YES (`~/.config/opencode/opencode.jsonc` → `mcp.github`, remote `https://api.githubcopilot.com/mcp/readonly`) | YES (`enabled: true`) | YES, as FAILED (`opencode mcp list` → `✗ github failed`) | NO (`mcp debug` → `✗ not authenticated`; zero `github` keys in `mcp-auth.json`; `401` + `does not support dynamic client registration`) | NO (MCP path; CLI `gh` fallback works) | §1.2, §1.6, §2 |
| supabase | N/A (remote URL) | YES (`opencode.jsonc` → `mcp.supabase`, project_ref `zbzhlhoxblguepplqppw`, features docs/database/debugging/development) | YES | YES (`✓ connected`) | YES (OAuth entry `supabase` present in `mcp-auth.json` by key name; values withheld) | YES (`connected` + `supabase_list_tables` returned 5 tables) | §1.2, §1.10, §2 |
| cloudflare | N/A (remote URL) | YES (`opencode.jsonc` → `mcp.cloudflare`, `https://mcp.cloudflare.com/mcp`) | YES | YES (`✓ connected`) | YES (OAuth entry `cloudflare` present in `mcp-auth.json` by key name; values withheld) | YES (`connected`; no privileged probe made) | §1.2, §2 |
| testsprite | On-demand via `npx -y @testsprite/testsprite-mcp@latest` (not in `npm ls -g`, as expected) | YES (`opencode.jsonc` → `mcp.testsprite`, local stdio, `API_KEY: {env:TESTSPRITE_API_KEY}`) | YES | YES (`✓ connected`) | ENV-KEY ( `TESTSPRITE_API_KEY` SET, len 53, value withheld; no `mcp-auth.json` entry, as expected) | YES (`connected`; no quota-consuming probe made) | §1.2, §1.8, §1.9, §2 |
| razorpay | NO evidence | NO | N/A | NO (absent from `mcp list`) | NO (zero hits in `mcp-auth.json`, no env name) | NO | §4; `grep -rli razorpay ~/.config/opencode/` → none; `mcp list` → 4 servers only |

### GitHub CLI (separate, not an MCP row)
| Tool | Path | Version | Auth | Usable | Evidence |
|---|---|---|---|---|---|
| `gh` | `/home/maya/.local/bin/gh` | `2.100.0 (2026-09-03)` | YES — logged in (keyring), account present, scopes `gist, read:org, repo, workflow` (token masked by gh) | YES | §1.3, §1.5 |

---

## 6. Notes and limits
- `opencode mcp list` discovery (4 servers, github failed, 3 connected) is the authoritative OpenCode-side signal; config-file reads corroborate it exactly.
- `mcp-auth.json` was inspected by KEY NAME ONLY (`grep -o` key pattern + case-insensitive name counts). Values were never read or printed.
- `gh auth status` token is masked by the CLI itself (`gho_****`); reproduced as emitted.
- Supabase `project_ref` and feature list are non-secret URL parameters from config/discovery output; included as scope evidence.
- No GUI inspection was possible from this CLI session; conclusion J rests on CLI discovery output, which is sufficient to rule out "configured but GUI-omitted".
- Supabase project code contains extensive Razorpay payment integration (tests, config, smoke scripts) — that is application code, not MCP configuration, and does not imply a Razorpay MCP server exists.
- No harmless read-only probes were made against Cloudflare or TestSprite beyond `mcp list`/`debug` status, to avoid account/quota side effects. No probes of any kind were made for Razorpay (no target exists).

STOP — report complete. No modifications were made.
