# MCP audit record

Date: 2026-09-14 (state after PART 2 of the environment setup; see `SKILLS_MCP_AUDIT.md` for the read-only baseline audit and §M post-setup state).

All four MCP servers are now **configured** in the global opencode config `~/.config/opencode/opencode.jsonc` (host-global, intentional for Soravo-development host; no project `opencode.json` / `.opencode/` override). The current session predates the config change, so **no server is connected yet**: opencode loads config at startup only, GitHub/Supabase/Cloudflare OAuth consents are pending, and TestSprite has no API key. Restart opencode → complete OAuth sign-ins → re-audit (see §M).

| Server | Source | Environment | Authentication | Scope / permission | Result |
| --- | --- | --- | --- | --- | --- |
| GitHub MCP | `github/github-mcp-server` (remote `https://api.githubcopilot.com/mcp/readonly`) | remote, `enabled: true` | OAuth (RFC 9728, auto-detected) — **pending human sign-in after restart** | **Read-only endpoint**: no mutation tools registered | **CONFIGURED** — not yet CONNECTED; repo read verified today via `gh` (token in OS keyring: gist, read:org, repo, workflow) |
| Supabase MCP | `supabase/mcp` (remote `https://mcp.supabase.com/mcp?read_only=true`) | remote, `enabled: true` | OAuth — pending; **no project_ref pinned** (no project exists yet per `supabase/README.md`) | Server-enforced `read_only=true` | **CONFIGURED** — **HUMAN ACTION REQUIRED** (project + OAuth) before functional |
| Cloudflare MCP | `cloudflare/mcp` (remote `https://mcp.cloudflare.com/mcp`) | remote, `enabled: true` | OAuth 2.1 — pending | Scoped to the Cloudflare account that completes consent | **CONFIGURED** — **HUMAN ACTION REQUIRED** (account sign-in) |
| TestSprite MCP | `@testsprite/testsprite-mcp@latest` (local `npx -y` stdio) | local, `enabled: true` | API key via `{env:TESTSPRITE_API_KEY}` (interpolation yields `""` while unset → server runs unauthenticated) | Account/API-key scope | **CONFIGURED** — **HUMAN ACTION REQUIRED** (free-plan account + API key exported into the host secret environment), then re-audit |

Implementation detail: `{env:VAR}` interpolation replaces an unset variable with an empty string (verified in the installed engine bundle, `input.text.replace(/\{env:([^}]+)\}/g, ...) || ""`). The TestSprite server therefore starts (no startup failure) but is unauthenticated until the key exists.

MCP policy in force: configured **without secrets** in any file (credentials only via `{env:}` / OS keyring / OAuth consent), read-only by default (GitHub `/readonly` endpoint, Supabase `read_only=true`), excluded from product runtime, recorded here, and any change requires an opencode restart.