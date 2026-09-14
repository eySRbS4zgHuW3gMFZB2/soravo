# MCP audit record

Date: 2026-09-14. No production-connected MCP server has been introduced. The current Codex MCP configuration has only built-in `computer-use` and `node_repl`; neither is Soravo runtime tooling.

| Server | Source | Environment | Authentication | Scope / permission | Result |
| --- | --- | --- | --- | --- | --- |
| GitHub connector | Codex app capability | Not connected to Soravo | GitHub CLI active token is invalid | No repository identity, remote, or project scope | Not safe for mutation; human must authenticate and provide/confirm repository |
| Supabase docs connector | Codex app capability | Documentation only | No Supabase project authentication | No database/function/project mutation connection | Deferred to Phase 2 |
| Cloudflare managed MCP | Not configured | N/A | N/A | N/A | Unavailable |
| TestSprite MCP | Not configured | N/A | N/A | N/A | Unavailable; requires dedicated test account/project configuration |

The official Codex MCP configuration guidance is https://learn.chatgpt.com/es-419/docs/extend/mcp. Any future MCP must be project-scoped, least-privilege, recorded here, and excluded from product runtime.
