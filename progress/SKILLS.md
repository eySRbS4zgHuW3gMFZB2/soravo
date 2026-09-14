# Skills audit record

Date: 2026-09-14 (rewritten for the current OpenCode environment; see `SKILLS_MCP_AUDIT.md` for the full read-only audit).

Environment: OpenCode desktop app. No skills are installed or configured (`~/.config/opencode/skills`, `.opencode/skills`, `~/.claude/skills`, `~/.agents/skills` all absent; config has no `skills` key). The only loaded skill is the engine's built-in `customize-opencode`. All entries in `07_AI_SKILLS.md` are AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED (source repos verified read-only via GitHub REST).

| Required skill(s) from `07_AI_SKILLS.md` | Status | Source / verification | Usable now |
| --- | --- | --- | --- |
| find-skills | AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED | `vercel-labs/skills` repo verified; `skills` npm CLI v1.5.26 on registry, not installed. | No |
| shadcn | AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED | `shadcn-ui/ui` repo verified; shadcn CLI package installed in app (CLI ≠ skill). | CLI yes; skill no |
| react, vercel-react-best-practices, vercel-composition-patterns, frontend-design, web-design-guidelines, frontend-accessibility | AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED | `Mindrally/skills`, `vercel-labs/agent-skills`, `aj-geddes/useful-ai-prompts` verified. | No |
| tauri-development, tauri, tauri-setup, rust-engineer, rust-review | AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED | `Mindrally/skills`, `hairyf/skills`, `full-stack-skills/tauri-skills`, `Jeffallan/claude-skills`, `trailofbits/skills` verified. | No |
| supabase, supabase-postgres-best-practices | AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED | `supabase/agent-skills` verified. (Prior "bundled openai-plugin skill" record was Codex-only and is not present in OpenCode.) | No; use only in Phase 2 |
| cloudflare, wrangler, workers-best-practices, web-perf, cloudflare-deploy | AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED | `cloudflare/skills` (14 SKILL.md files incl. all four) and `openai/skills` (cloudflare-deploy) verified. | No |
| github, gh-cli | AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED | `Dimillian/Skills`, `trailofbits/skills` verified. GitHub reachable via authenticated `gh` CLI regardless. | CLI yes; skill no |
| playwright, vitest | AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED | `openai/skills` (playwright member-verified), `supabase/supabase` verified. Vitest runs in-app. | Vitest package yes; skills no |
| security-guidance, securability-engineering, agent-security-audit, mcp-server-review, semgrep, supply-chain-risk-auditor, secure-workflow-guide, insecure-defaults, codeql | AVAILABLE THROUGH REGISTRY BUT NOT INSTALLED | `OWASP/secure-agent-playbook`, `trailofbits/skills` verified. `semgrep` / `codeql` / `sqlfluff` CLIs absent on host. | No |
| TestSprite MCP | UNAVAILABLE (MCP, not a skill) | No account, API key, or MCP registration. Human action required; see `SKILLS_MCP_AUDIT.md`. | No |

No listed skill is installed or rejected as untrusted. For every future install: inspect the source `SKILL.md`, record version/source, place under `~/.config/opencode/skills/<name>/SKILL.md` (or `skills.paths`), and restart opencode (config is loaded at startup only). Record shell/network actions and credentials before use. Historical note: the earlier record dated 2026-09-14 described a Codex-app environment (bundled `openai-curated-remote` plugin, `computer-use`/`node_repl`); that environment is not the build agent for this project.