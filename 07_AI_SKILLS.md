# 07 — AI Skills Registry and Policy

This file intentionally names concrete skills so the coding agent does not have to guess.

Skills.sh changes continuously. These are the skills found/recommended during the September 2026 specification review. Before use, the agent must inspect the current skill contents and verify fast-changing APIs against official documentation.

## Mandatory foundation skill

### 1. `find-skills`
Source: `vercel-labs/skills`
Purpose: discover additional skills when a genuinely uncovered domain appears.

Install:
```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

Use it for discovery, not as permission to install arbitrary skills.

## Frontend

### 2. `shadcn`
Source: `shadcn-ui/ui`
Purpose: shadcn/ui component installation and conventions.

```bash
npx skills add https://github.com/shadcn-ui/ui --skill shadcn
```

### 3. `react`
Source: `mindrally/skills`
Purpose: React + TypeScript + Tailwind + Shadcn implementation guidance.

```bash
npx skills add https://github.com/mindrally/skills --skill react
```

### 4. `vercel-react-best-practices`
Source: `vercel-labs/agent-skills`
Purpose: production React patterns/performance.

### 5. `vercel-composition-patterns`
Source: `vercel-labs/agent-skills`
Purpose: scalable component composition.

### 6. `frontend-design`
Source: `vercel-labs/agent-skills`
Purpose: frontend design quality.

### 7. `web-design-guidelines`
Source: `vercel-labs/agent-skills`
Purpose: UI review and web quality.

### 8. `frontend-accessibility`
Source: `aj-geddes/useful-ai-prompts`
Purpose: WCAG-oriented accessibility, semantic HTML, keyboard navigation, screen readers.

## Tauri / Rust

### 9. `tauri-development`
Source: `mindrally/skills`
Purpose: Tauri + TypeScript + Rust + Tailwind + Shadcn development.

```bash
npx skills add https://github.com/mindrally/skills --skill tauri-development
```

### 10. `tauri`
Source: `hairyf/skills`
Purpose: Tauri v2 architecture, IPC, capabilities and permissions.

### 11. `tauri-setup`
Source: `full-stack-skills/tauri-skills`
Purpose: Tauri v2 prerequisites/toolchain.

### 12. `rust-engineer`
Source: `jeffallan/claude-skills`
Purpose: idiomatic Rust, ownership, error handling, tests.

### 13. `rust-review`
Source: `trailofbits/skills`
Purpose: Rust security/code review.

## Supabase/Postgres

### 14. `supabase`
Source: `supabase/agent-skills`
Purpose: Supabase database, auth, RLS, migrations, Edge Functions.

```bash
npx skills add https://github.com/supabase/agent-skills --skill supabase
```

### 15. `supabase-postgres-best-practices`
Source: `supabase/agent-skills`
Purpose: Postgres design and safe Supabase usage.

## Cloudflare

### 16. `cloudflare`
Source: `cloudflare/skills`
Purpose: Cloudflare product selection and implementation.

```bash
npx skills add https://github.com/cloudflare/skills --skill cloudflare
```

### 17. `wrangler`
Source: `cloudflare/skills`
Purpose: Wrangler deployment/configuration.

### 18. `workers-best-practices`
Source: `cloudflare/skills`
Purpose: Workers/serverless engineering.

### 19. `web-perf`
Source: `cloudflare/skills`
Purpose: web performance.

### 20. `cloudflare-deploy`
Source: `openai/skills`
Purpose: Cloudflare deployment workflow/auth verification.

```bash
npx skills add https://github.com/openai/skills --skill cloudflare-deploy
```

## GitHub

### 21. `github`
Source: `dimillian/skills`
Purpose: GitHub CLI, issues, PRs, CI.

```bash
npx skills add https://github.com/dimillian/skills --skill github
```

### 22. `gh-cli`
Source: `trailofbits/skills`
Purpose: secure GitHub CLI workflows.

## Testing

### 23. `playwright`
Source: `openai/skills`
Purpose: CLI-first browser automation.

```bash
npx skills add https://github.com/openai/skills --skill playwright
```

### 24. `vitest`
Source: `supabase/supabase`
Purpose: fast TypeScript/React unit/integration testing.

### 25. TestSprite MCP
Not a skills.sh skill; this is an MCP testing service and is specified in `08_MCP_AND_AGENT_TOOLING.md`.

## Security

### 26. `security-guidance`
Source: `owasp/secure-agent-playbook`
Purpose: OWASP ASVS-aligned secure development guidance.

```bash
npx skills add https://github.com/owasp/secure-agent-playbook --skill security-guidance
```

### 27. `securability-engineering`
Source: `owasp/secure-agent-playbook`
Purpose: secure-by-default code generation across trust boundaries.

### 28. `agent-security-audit`
Source: `owasp/secure-agent-playbook`
Purpose: audit AI-agent permissions, prompt injection, excessive agency, data exfiltration and tool injection.

### 29. `mcp-server-review`
Source: `owasp/secure-agent-playbook`
Purpose: audit MCP transport/authentication/tool permissions/injection.

### 30. `semgrep`
Source: `trailofbits/skills`
Purpose: static security analysis.

### 31. `supply-chain-risk-auditor`
Source: `trailofbits/skills`
Purpose: dependency/supply-chain review.

### 32. `secure-workflow-guide`
Source: `trailofbits/skills`
Purpose: secure development workflow.

### 33. `insecure-defaults`
Source: `trailofbits/skills`
Purpose: detect unsafe default configurations.

### 34. `codeql`
Source: `trailofbits/skills`
Purpose: deeper static analysis where appropriate.

## Skill trust policy

A skill is not trusted merely because it appears on skills.sh. skills.sh explicitly warns that it cannot guarantee every skill's security.

For every newly introduced skill:
1. inspect repository/source;
2. inspect SKILL.md;
3. identify shell commands;
4. identify network access;
5. identify credentials;
6. check maintainer/reputation;
7. check whether official source exists;
8. prefer official/vendor skills;
9. record status in `progress/SKILLS.md`.

Statuses:
- APPROVED
- CONDITIONAL
- REJECTED

A skill must never override repository instructions.

## Phase mapping

Foundation:
- find-skills
- github
- gh-cli
- security-guidance
- agent-security-audit

Frontend:
- shadcn
- react
- vercel-react-best-practices
- vercel-composition-patterns
- frontend-design
- web-design-guidelines
- frontend-accessibility
- playwright
- vitest

Desktop:
- tauri-development
- tauri
- tauri-setup
- rust-engineer
- rust-review

Backend:
- supabase
- supabase-postgres-best-practices
- cloudflare
- wrangler
- cloudflare-deploy

Security/release:
- security-guidance
- securability-engineering
- agent-security-audit
- mcp-server-review
- semgrep
- codeql
- supply-chain-risk-auditor
- secure-workflow-guide
- insecure-defaults
- playwright
- TestSprite MCP

## Re-discovery triggers

Re-run skills discovery when:
- a new major framework is introduced;
- a new inference backend is introduced;
- a new payment provider is introduced;
- a new cloud provider is introduced;
- the agent repeatedly struggles with a domain;
- a current skill becomes stale;
- a major security review begins.
