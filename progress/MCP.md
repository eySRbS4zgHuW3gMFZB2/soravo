# MCP audit record

Date: 2026-09-14 (rewritten for the current OpenCode environment; see `SKILLS_MCP_AUDIT.md` for the full read-only audit).

No MCP server is configured or connected. The OpenCode config (`~/.config/opencode/opencode.jsonc`) contains no `mcp` key; there is no project `opencode.json` / `.opencode/`. No `mcp__*` tool is exposed to the build agent. Official server sources verified read-only: `github/github-mcp-server`, `supabase-community/supabase-mcp`, `cloudflare/mcp-server-cloudflare`; TestSprite is a cloud service (org `TestSprite`).

| Server | Source | Environment | Authentication | Scope / permission | Result |
| --- | --- | --- | --- | --- | --- |
| GitHub MCP | Not configured | n/a | Not present; `gh` CLI token in OS keyring (scopes gist, read:org, repo, workflow), read verified | n/a | Not connected as MCP; GitHub usable read-only/write via `gh` + `git` today |
| Supabase MCP | Not configured | n/a | No access token; no project | n/a | NOT CONFIGURED / HUMAN ACTION REQUIRED (Phase 2) |
| Cloudflare MCP | Not configured | n/a | No account/token | n/a | NOT CONFIGURED / HUMAN ACTION REQUIRED (deployment phase) |
| TestSprite MCP | Not configured | n/a | No account/API key | n/a | NOT CONFIGURED / HUMAN ACTION REQUIRED (dedicated test account, key via host secret store) |

Future MCP policy: any MCP must be recorded here, project-scoped, least-privilege, read-only unless a task requires mutation, credentials supplied by the human via the host secret store and referenced with `{env:VAR}` (no plaintext in config), and excluded from product runtime. After any config change, restart opencode. Historical note: the earlier record described a Codex-app environment (`computer-use`, `node_repl`); that environment is not the build agent for this project.