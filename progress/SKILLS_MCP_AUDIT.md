# Skills & MCP Environment Audit — Soravo

Date: 2026-09-14
Audit type: READ-ONLY. No application source, package config, MCP config, credential, or external service was modified.
Auditor: opencode agent session (primary build agent).

## 0. Environment under audit

- Agent host: **OpenCode desktop app** (`/opt/OpenCode/ai.opencode.desktop`, Electron shell around the opencode engine).
- Global config: `~/.config/opencode/opencode.jsonc` — schema-only (`{"$schema":"https://opencode.ai/config.json"}`). **No `mcp`, no `skills`, no `plugin` entries.**
- Project config: no `opencode.json` / `opencode.jsonc` / `.opencode/` inside the Soravo repo.
- Skills directories checked and found **absent**: `~/.config/opencode/skills`, `.opencode/skills`, external `~/.claude/skills`, `~/.agents/skills`.
- MCP config files found **absent**: no `mcp` key in any opencode config; no `~/.mcp.json` / `./.mcp.json` / `./mcp.json`.
- Session toolset: **no `mcp__*` tool is exposed** to the active agent. Tools present are the standard opencode set (bash, read/write/edit/glob/grep, web, task, todo) plus the single built-in skill below.
- Built-in skill actually loaded by the engine: **`customize-opencode`** (registered in opencode core; not part of `07_AI_SKILLS.md`'s list).
- No `skill` MCP tool, no custom plugins: `~/.config/opencode/node_modules/` contains only `@opencode-ai/*` SDK/plugin packages.

Note on pre-existing artifacts that are NOT part of this environment:
- `~/.codex/vendor_imports/skills/` (a git clone of curated skills) and `/opt/codex-desktop/resources/skills/` are **Codex** environment leftovers. OpenCode does not load them. They are ignored by this audit and must not be treated as installed skills.

### How OpenCode actually loads skills (verified mechanism)

OpenCode scans for `**/SKILL.md` under these locations (see built-in `customize-opencode` skill, which is the engine's own documentation):
- project: `.opencode/skills/<name>/SKILL.md`
- global: `~/.config/opencode/skills/<name>/SKILL.md`
- external auto-loaded: `~/.claude/skills/<name>/SKILL.md`, `~/.agents/skills/<name>/SKILL.md`
- configured: `skills.paths` (array of dirs) and `skills.urls` (remote skill lists) in `opencode.json`
- built-in skills registered in code (e.g., `customize-opencode`); plugins may register more.

A skill must have `name` + `description` frontmatter or it is filtered out. Config is read once at startup; any change requires an opencode restart.

skills.sh registry distribution: the `skills` npm CLI (verified present on npm as v1.5.26, "The open agent skills ecosystem") can fetch registry skills (e.g. `npx skills add https://github.com/<owner>/<repo> --skill <name>`). skills.sh skills are SKILL.md-based and can be dropped into the OpenCode skill paths above. The `skills` CLI is **not installed** on this host.

## A. Skills summary

- Total entries in `07_AI_SKILLS.md`: **33 skills + 1 MCP (TestSprite)**.
- **INSTALLED / AVAILABLE (loaded by opencode): 0** of the 33. The only loaded skill is the built-in `customize-opencode`, which is not part of the registry list.
- **AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED: 33**. Every documented source repository was verified to exist (GitHub REST, read-only). Skill-file membership was spot-verified for key repos (cloudflare, openai); the others are per the documented registry listing.
- **UNAVAILABLE: 0** (as standalone registry skills).
- **FAILED TO LOAD: 0** (nothing was installed or attempted).
- **NOT VERIFIED: 0** at the registry/repo level; per-skill exact file membership is not byte-verified except where noted.
- Tooling caveat: the `vitest` and `shadcn` **npm packages** are installed as project dependencies and work — but the corresponding *skills* are not installed as opencode skills. GitHub `gh` CLI is authenticated and usable (see F).

## B. Complete skill-by-skill table

Classification legend (exactly one state per skill):
- **REG-AVAIL** = AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED.
- None of the registry skills are INSTALLED/AVAILABLE, UNAVAILABLE, FAILED TO LOAD, or NOT VERIFIED at repo level.

Verify method column: "repo-OK" = source repo confirmed via GitHub REST (read-only); "member-OK" = the named skill file exists in the repo (contents/tree listing); "doc" = per `07_AI_SKILLS.md` listing.

| Skill | Source repo (verified) | Availability | Loaded/usable in opencode | Verify | Install required |
| --- | --- | --- | --- | --- | --- |
| find-skills | vercel-labs/skills | REG-AVAIL | No | repo-OK | Yes |
| shadcn (skill) | shadcn-ui/ui | REG-AVAIL | No | repo-OK | Yes (CLI alone ≠ skill) |
| react | Mindrally/skills | REG-AVAIL | No | repo-OK | Yes |
| vercel-react-best-practices | vercel-labs/agent-skills | REG-AVAIL | No | repo-OK | Yes |
| vercel-composition-patterns | vercel-labs/agent-skills | REG-AVAIL | No | repo-OK | Yes |
| frontend-design | vercel-labs/agent-skills | REG-AVAIL | No | repo-OK | Yes |
| web-design-guidelines | vercel-labs/agent-skills | REG-AVAIL | No | repo-OK | Yes |
| frontend-accessibility | aj-geddes/useful-ai-prompts | REG-AVAIL | No | repo-OK | Yes |
| tauri-development | Mindrally/skills | REG-AVAIL | No | repo-OK | Yes |
| tauri | hairyf/skills | REG-AVAIL | No | repo-OK | Yes |
| tauri-setup | full-stack-skills/tauri-skills | REG-AVAIL | No | repo-OK | Yes |
| rust-engineer | Jeffallan/claude-skills | REG-AVAIL | No | repo-OK | Yes |
| rust-review | trailofbits/skills | REG-AVAIL | No | repo-OK | Yes |
| supabase | supabase/agent-skills | REG-AVAIL | No | repo-OK | Yes |
| supabase-postgres-best-practices | supabase/agent-skills | REG-AVAIL | No | repo-OK | Yes |
| cloudflare | cloudflare/skills | REG-AVAIL | No | repo-OK, member-OK | Yes |
| wrangler | cloudflare/skills | REG-AVAIL | No | repo-OK, member-OK | Yes |
| workers-best-practices | cloudflare/skills | REG-AVAIL | No | repo-OK, member-OK | Yes |
| web-perf | cloudflare/skills | REG-AVAIL | No | repo-OK, member-OK | Yes |
| cloudflare-deploy | openai/skills | REG-AVAIL | No | repo-OK, member-OK | Yes |
| github | Dimillian/Skills | REG-AVAIL | No | repo-OK | Yes |
| gh-cli | trailofbits/skills | REG-AVAIL | No | repo-OK | Yes |
| playwright | openai/skills | REG-AVAIL | No | repo-OK, member-OK | Yes |
| vitest (skill) | supabase/supabase | REG-AVAIL | No | repo-OK | Yes (runner already usable via package) |
| TestSprite MCP | TestSprite org (Docs/CLI repos) | see §E (MCP) | No | repo-OK | Yes (service + credentials) |
| security-guidance | OWASP/secure-agent-playbook | REG-AVAIL | No | repo-OK | Yes |
| securability-engineering | OWASP/secure-agent-playbook | REG-AVAIL | No | repo-OK | Yes |
| agent-security-audit | OWASP/secure-agent-playbook | REG-AVAIL | No | repo-OK | Yes |
| mcp-server-review | OWASP/secure-agent-playbook | REG-AVAIL | No | repo-OK | Yes |
| semgrep | trailofbits/skills | REG-AVAIL | No | repo-OK | Yes (+ CLI absent) |
| supply-chain-risk-auditor | trailofbits/skills | REG-AVAIL | No | repo-OK | Yes |
| secure-workflow-guide | trailofbits/skills | REG-AVAIL | No | repo-OK | Yes |
| insecure-defaults | trailofbits/skills | REG-AVAIL | No | repo-OK | Yes |
| codeql | trailofbits/skills | REG-AVAIL | No | repo-OK | Yes (+ CLI absent) |

Additional verified findings:
- `skills` npm CLI v1.5.26 exists on the registry; **not installed** on host.
- Static-analysis CLIs **absent**: `semgrep`, `codeql`, `sqlfluff`.
- Cloud/deploy CLIs **absent**: `wrangler`, `supabase`.

## C. MCP summary

- opencode MCP configuration: **zero servers configured** (no `mcp` key; no config file with MCP entries; no MCP tool exposed to the session).
- Official MCP server binaries/repos verified to exist via GitHub REST: `github/github-mcp-server`, `supabase-community/supabase-mcp`, `cloudflare/mcp-server-cloudflare`.
- TestSprite MCP: service-level (cloud SaaS, org `TestSprite`, docs at `TestSprite/Docs`); no MCP bundle verified in-repo, access is token/account-gated.
- No MCP server is CONFIGURED + CONNECTED, CONFIGURED-BUT-AUTH, or CONFIGURED-BUT-DISCONNECTED in this environment.

## D. Complete MCP-by-MCP table

| MCP | Official source (verified) | Configured? | Connected? | Auth status | Scope/permissions | Read ops work? | Write ops? | Usable by this session? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub MCP | github/github-mcp-server | No (no `mcp` key) | No | No server; `gh` token in OS keyring (scopes gist, read:org, repo, workflow) | n/a (not connected) | MCP: no. CLI `gh`/`git`: yes, verified read-only | MCP: no. CLI `git push`: yes (used previously) | As MCP: No. As CLI fallback: Yes |
| Supabase MCP | supabase-community/supabase-mcp | No | No | No access token; no project configured | n/a | No | No | **No — NOT CONFIGURED / HUMAN ACTION REQUIRED** |
| Cloudflare managed MCP | cloudflare/mcp-server-cloudflare (+ Cloudflare dashboard-managed server) | No | No | No Cloudflare account/token bound to host | n/a | No | No | **No — NOT CONFIGURED / HUMAN ACTION REQUIRED** |
| TestSprite MCP | TestSprite org / cloud service | No | No | No account, no API key | n/a | No | No | **No — NOT CONFIGURED / HUMAN ACTION REQUIRED** |

## E. TestSprite status

- **Installed:** No. **Configured:** No. **Authenticated:** No. **Usable by this opencode session:** No.
- Official organization verified read-only: `TestSprite` (repos `TestSprite/Docs`, `TestSprite/run-action`, `TestSprite/testsprite-cli`). The MCP is a cloud test-automation integration (reads PRD, generates/executes tests, reports bugs) — access requires a TestSprite account and an API key/token.
- **Exact human action required:** (1) create a dedicated TestSprite account (per `progress/MCP.md` trust policy, test accounts only, no private/prod data); (2) generate an API key; (3) store the key via the host secret mechanism (never in-repo); (4) register the MCP server with the key in the opencode config `mcp` block; (5) restart opencode; (6) re-run this audit to confirm CONFIGURED + CONNECTED.
- Do not substitute another testing platform for TestSprite. `playwright` (skill + `npx @playwright/mcp`) remains a separate, complementary tool only if installed deliberately via the trust policy.

## F. GitHub integration

- **MCP:** not configured → no `mcp__github_*` tools in the session.
- **Verified CLI integration:** `gh` CLI authenticated as `eySRbS4zgHuW3gMFZB2` (token in OS keyring; scopes `gist, read:org, repo, workflow`). Read-only calls confirmed: `gh api repos/eySRbS4zgHuW3gMFZB2/soravo` returns the private repo (`visibility: private`, default branch `main`). Official repo checks (MCP servers, skill sources) all performed via the authenticated CLI.
- Conclusion: GitHub interaction works today via `gh` + `git` without additional setup. GitHub MCP is optional.

## G. Supabase integration

- **NOT CONFIGURED.** No Supabase MCP server, no Supabase CLI, no access token, no project reference anywhere in opencode config or environment.
- Per audit rule: not connecting to an unknown project. **HUMAN ACTION REQUIRED** when Phase 2 starts: provide a scoped dev/staging Supabase project + access token via the host secret mechanism, then register a project-scoped, read-only-by-default MCP server.

## H. Cloudflare integration

- **NOT CONFIGURED.** No Cloudflare MCP server, no `wrangler`, no API token, no account bindings.
- **HUMAN ACTION REQUIRED** when deployment is scheduled: owner creates a scoped Cloudflare account/API token (deploy-scope only), stores it via the host secret mechanism, registers the Cloudflare MCP server, and verifies scope before any deploy. Nothing was deployed or modified (audit made zero external calls beyond read-only repo metadata/listings).

## I. Security / credential findings

- **No secrets found in the Soravo repository.** Verified by:
  - No `.env` / `.env.*` / credential files present (tracked or untracked).
  - `gitignored`: `.env`, `.env.*` (with `!.env.example`), `*.pem`, `*.key`.
  - History-wide scan across all git objects for known secret prefixes (`ghp_`, `github_pat_`, `sbp_`, `sk-` long tokens, private-key headers, `AKIA`*): **zero matches**.
  - No `mcp.json` / `.mcp.json` anywhere in the repo (so no inline MCP secrets possible).
- `gh` token is stored in the **OS keyring**, not in the repo.
- `OPENCODE_SERVER_PASSWORD`/`OPENCODE_SERVER_USERNAME` in the process environment are the opencode desktop app's localhost loopback credentials (app runtime), not cloud/API credentials; not file-backed and not printed.
- No MCP configuration containing plaintext secrets exists anywhere (there is no MCP configuration at all).

## J. Human actions required

1. **TestSprite**: create dedicated account + API key; store via host secret store; configure MCP; restart opencode; re-audit. (Required before QA-003/TestSprite-backed runs.)
2. **Supabase**: create/provide a scoped dev project + access token at Phase 2 start; register project-scoped read-only MCP.
3. **Cloudflare**: create scoped deploy token + account binding when deployment work begins; register Cloudflare MCP.
4. (Optional) Skills: decide which registry skills to install; the recommended minimal set with sources is in §K. No skill installs remove the human's authority to refuse permissions.
5. Code-signing credentials (later phase, already tracked).

## K. Recommended configuration (not executed)

Skills (place under `~/.config/opencode/skills/<name>/SKILL.md`, or `skills.paths`), each after source trust review per `07_AI_SKILLS.md`:
- Frontend now: `shadcn` (shadcn-ui/ui), `react` (Mindrally/skills), `frontend-accessibility` (aj-geddes/useful-ai-prompts).
- Desktop later: `tauri-development` (Mindrally/skills), `rust-review` (trailofbits/skills).
- Security baseline: `security-guidance`, `agent-security-audit`, `mcp-server-review` (OWASP/secure-agent-playbook), `semgrep` (trailofbits/skills; requires `semgrep` CLI install).
- Phase-gated: `supabase` (supabase/agent-skills), `cloudflare`/`wrangler` (cloudflare/skills), `playwright` (openai/skills), `vitest` (supabase/supabase).

MCP (only with human-provided credentials, via host secret store, `{env:VAR}` interpolation, no plaintext in config):
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "github": { "type": "local", "command": ["npx", "-y", "@modelcontextprotocol/server-github"], "environment": { "GITHUB_PERSONAL_ACCESS_TOKEN": "{env:GITHUB_TOKEN}" } },
    "supabase": { "type": "local", "command": ["npx", "-y", "@supabase/mcp-server-supabase"], "environment": { "SUPABASE_ACCESS_TOKEN": "{env:SUPABASE_ACCESS_TOKEN}" } },
    "cloudflare": { "type": "local", "command": ["npx", "-y", "@cloudflare/mcp-server-cloudflare"], "environment": { "CLOUDFLARE_API_TOKEN": "{env:CLOUDFLARE_API_TOKEN}" } },
    "testsprite": { "type": "remote" /* URL + token via {env:TESTSPRITE_API_KEY} */ }
  }
}
```
All MCP servers: project-scoped, least-privilege, read-only unless a task requires mutation, recorded in `progress/MCP.md`. Any change requires an opencode restart.

## L. Already usable without additional setup

- GitHub read/write via `gh` (authenticated) and `git`/`ssh`-less https remote to `eySRbS4zgHuW3gMFZB2/soravo`.
- Full local toolchain: Node 22.23.1, pnpm 11.17.0, Rust 1.97.1, Tauri 2 toolchain; `vitest`, `react-router`, shadcn v4 packages installed in-app.
- Web/registry access (npm registry, GitHub REST via `gh`, DNS verified in environment audit).
- Built-in `customize-opencode` skill for opencode configuration questions.
- All content-page engineering that needs no MCP (WEB-001..WEB-004 are done without any MCP server).