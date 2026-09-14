# Skills audit

Date: 2026-09-14

| Required skill(s) from `07_AI_SKILLS.md` | Status | Source / verification | Usable now |
| --- | --- | --- | --- |
| find-skills | AVAILABLE BUT NEEDS INSTALLATION | Exact `vercel-labs/skills` registry entry specified; `npx skills` was not verified within the bounded audit timeout. | No |
| shadcn | AVAILABLE BUT NEEDS INSTALLATION | Exact `shadcn-ui/ui` registry entry specified; official shadcn CLI package is installed in both apps. | CLI configuration is usable; registry component download is DNS-blocked |
| react, vercel-react-best-practices, vercel-composition-patterns, frontend-design, web-design-guidelines, frontend-accessibility | AVAILABLE BUT NEEDS INSTALLATION | Listed sources were not installed as skills. | No |
| tauri-development, tauri, tauri-setup, rust-engineer, rust-review | AVAILABLE BUT NEEDS INSTALLATION | Listed sources were not installed as skills. Current official Tauri documentation was used for the shell. | No |
| supabase | AVAILABLE | Bundled plugin skill at `openai-curated-remote/supabase/1.0.0`. | Yes; use only in Phase 2 |
| supabase-postgres-best-practices | AVAILABLE | Bundled plugin skill at `openai-curated-remote/supabase/1.0.0`. | Yes; use only in Phase 2 |
| cloudflare, wrangler, workers-best-practices, web-perf, cloudflare-deploy | AVAILABLE BUT NEEDS INSTALLATION | Listed sources were not installed as skills. | No |
| github, gh-cli | AVAILABLE BUT NEEDS INSTALLATION | Listed sources were not installed as skills. | No |
| playwright, vitest | AVAILABLE BUT NEEDS INSTALLATION | Vitest package is installed; neither named skill is installed. | Vitest package yes; skill no |
| security-guidance, securability-engineering, agent-security-audit, mcp-server-review, semgrep, supply-chain-risk-auditor, secure-workflow-guide, insecure-defaults, codeql | AVAILABLE BUT NEEDS INSTALLATION | Listed sources were not installed as skills; Semgrep and CodeQL CLIs are also absent. | No |
| TestSprite MCP | UNAVAILABLE | No TestSprite MCP server, credential, CLI, or project is configured. | No |

No listed skill is rejected as untrusted; none was installed blindly. For every later skill install, inspect the source/SKILL.md and record version, shell/network actions, and credentials before use.
