# Skills audit record

Date: 2026-09-14 (state after PART 1 of the environment setup; see `SKILLS_MCP_AUDIT.md` for the read-only baseline audit in §A–§L and the post-setup verification in §M).

Environment: OpenCode desktop app. All skills were installed with the `skills` npm CLI (v1.5.26) into the shared auto-loaded directory `~/.agents/skills/<name>/SKILL.md` and are additionally declared via `skills.paths` in `~/.config/opencode/opencode.jsonc`. OpenCode reads config and scans skill paths **once at startup**, so the skills become loadable after an opencode restart.

**32 of 33 required skills are INSTALLED** (each verified: `SKILL.md` present, exactly one per directory, frontmatter `name` matches the directory name). The remaining skill (`insecure-defaults`) is **NOT AVAILABLE** as an installable standalone skill (see below).

Install command pattern used per skill:
`npx skills add <owner>/<repo> --skill <name> -g -y --copy` (for nested repos, `<owner>/<repo>/<subpath>` with `--full-depth`).

| Required skill(s) from `07_AI_SKILLS.md` | Status | Source / verification | Loadable after restart |
| --- | --- | --- | --- |
| find-skills | INSTALLED | `vercel-labs/skills` | Yes |
| shadcn | INSTALLED | `shadcn-ui/ui` (the shadcn CLI package is also installed in-app; the skill is separate) | Yes |
| react | INSTALLED | `mindrally/skills` | Yes |
| vercel-react-best-practices | INSTALLED | `vercel-labs/agent-skills` | Yes |
| vercel-composition-patterns | INSTALLED | `vercel-labs/agent-skills` | Yes |
| frontend-design | INSTALLED | `vercel-labs/open-agents` — **SOURCE CHANGE**: not present in `vercel-labs/agent-skills` (verified repo tree + registry); installed from the exact-skill-name `vercel-labs/open-agents` repo instead | Yes |
| web-design-guidelines | INSTALLED | `vercel-labs/agent-skills` | Yes |
| frontend-accessibility | INSTALLED | `aj-geddes/useful-ai-prompts` | Yes |
| tauri-development | INSTALLED | `mindrally/skills` | Yes |
| tauri | INSTALLED | `hairyf/skills` | Yes |
| tauri-setup | INSTALLED | `full-stack-skills/tauri-skills` | Yes |
| rust-engineer | INSTALLED | `jeffallan/claude-skills` | Yes |
| rust-review | INSTALLED | `trailofbits/skills` | Yes |
| supabase | INSTALLED | `supabase/agent-skills` | Yes (Phase 2 gate applies) |
| supabase-postgres-best-practices | INSTALLED | `supabase/agent-skills` | Yes (Phase 2 gate applies) |
| cloudflare | INSTALLED | `cloudflare/skills` | Yes |
| wrangler | INSTALLED | `cloudflare/skills` | Yes |
| workers-best-practices | INSTALLED | `cloudflare/skills` | Yes |
| web-perf | INSTALLED | `cloudflare/skills` | Yes |
| cloudflare-deploy | INSTALLED | `openai/skills` | Yes |
| github | INSTALLED | `dimillian/skills` | Yes |
| gh-cli | INSTALLED | `trailofbits/skills` | Yes |
| playwright | INSTALLED | `openai/skills` (frontmatter `name: "playwright"` is quoted; parses fine) | Yes |
| vitest | INSTALLED | `supabase/supabase` (`.agents/skills/vitest`, installed with `--full-depth`) | Yes |
| security-guidance | INSTALLED | `owasp/secure-agent-playbook` | Yes |
| securability-engineering | INSTALLED | `owasp/secure-agent-playbook` | Yes |
| agent-security-audit | INSTALLED | `owasp/secure-agent-playbook` | Yes |
| mcp-server-review | INSTALLED | `owasp/secure-agent-playbook` | Yes |
| semgrep | INSTALLED | `trailofbits/skills` | Yes (needs `semgrep` CLI for execution) |
| supply-chain-risk-auditor | INSTALLED | `trailofbits/skills` | Yes |
| secure-workflow-guide | INSTALLED | `trailofbits/skills` | Yes |
| codeql | INSTALLED | `trailofbits/skills` | Yes (needs `codeql` CLI for execution) |
| insecure-defaults | **SOURCE UNAVAILABLE** | `trailofbits/skills` ships it **only** as a Claude Code plugin (`plugins/insecure-defaults/.claude-plugin/plugin.json`, no `SKILL.md`); the `skills` CLI reports "No matching skills found for: insecure-defaults" even with `--full-depth`. Not installable as a standalone skill. | No |
| TestSprite MCP | n/a (MCP, not a skill) | Configured; see `MCP.md` | See `MCP.md` |

Notes:
- Static-analysis CLIs still absent on host: `semgrep`, `codeql`, `sqlfluff` (the skills are installed but need the underlying CLI to execute).
- Every installed skill was copied from a verified upstream source under `~/.agents/skills/`; no untrusted content.
- Non-functional "PromptScript does not support global skill installation" lines emitted by the CLI during install are harmless; the OpenCode copy install succeeds.
- After restart, loadability is verified by invoking each skill via the agent skill tool (see `SKILLS_MCP_AUDIT.md` §M).