# 07 — AI Skills Registry and Policy

This file intentionally names concrete skills so the coding agent does not have to guess.

Skills.sh changes continuously. These are the skills found/recommended during the September 2026 specification review. Before use, the agent must inspect the current skill contents and verify fast-changing APIs against official documentation.

Installing a skill is NOT the same as loading it for a task. The Skill Selection Gate (`03_AI_INSTRUCTIONS.md` §5) and the Skill Selection Matrix in this file govern WHEN a skill is actually loaded. The registry below is the inventory, not an instruction to load everything.

## Skill Selection Gate (mandatory)

For EVERY implementation task, the agent MUST identify and load the relevant installed skills BEFORE planning implementation or modifying source code. The gate is:

1. Read the task definition.
2. Classify the task by domain — one or more of: frontend/UI; React/TypeScript; accessibility/design; Tauri; Rust; audio; STT/ML; Supabase/database/auth; Cloudflare/deployment; GitHub/Git; testing; security; payments/licensing; documentation/release.
3. Select ALL installed skills that are materially relevant to the task, using the Skill Selection Matrix below.
4. Load those skills BEFORE editing source, designing database schema, changing security-sensitive configuration, or creating implementation plans that depend on a skill.
5. Record which skills were selected and loaded in the task progress/handoff record (`progress/STATUS.md`, `progress/NEXT.md`).
6. If a relevant installed skill exists but is NOT loaded, explain why before proceeding.
7. Security skills are mandatory for any task involving: authentication; authorization; database/RLS; secrets; network/API endpoints; payments; file/process execution; IPC; model downloads; deployment; user data.
8. Testing skills are mandatory whenever tests are created or modified, or a task has a testing acceptance criterion.
9. Do NOT load unrelated skills merely because they exist.
10. Never claim a skill was used unless its content was actually loaded/read during that task.

Skills and MCP are separate: skills provide engineering guidance; MCP provides tools/actions/data. MCP availability is never evidence that a skill was loaded, and a loaded skill is never evidence that an MCP tool was called.

## Skill Selection Matrix

Authoritative domain → installed-skill mapping (registry state 2026-09-14; see `progress/SKILLS.md` and `progress/SKILLS_MCP_AUDIT.md`).

| Domain | Skills to load | Notes |
| --- | --- | --- |
| Frontend/UI | `shadcn`, `react`, `vercel-react-best-practices`, `vercel-composition-patterns`, `frontend-design`, `web-design-guidelines` | `shadcn` for component install/conventions; design/web-quality guidance for anything user-facing. |
| React/TypeScript | `react`, `vercel-react-best-practices`, `vercel-composition-patterns` | `react` is the base implementation guide; the other two apply when composing or optimizing components. |
| Accessibility/design | `frontend-accessibility`, `web-design-guidelines`, `frontend-design` | WCAG implementation, keyboard/screen-reader support, UI review. |
| Tauri | `tauri`, `tauri-development`, `tauri-setup` | `tauri-setup` only when touching toolchain/prerequisites; `tauri` covers IPC/capabilities/permissions. |
| Rust | `rust-engineer` (implementation), `rust-review` (security/quality review) | Load `rust-review` whenever reviewing or hardening existing Rust code. |
| Audio | — (none installed) | No dedicated audio skill installed. Record this absence in the gate record; do NOT invent a mapping. |
| STT/ML | — (none installed) | No dedicated STT/ML skill installed. Record this absence in the gate record; do NOT invent a mapping. |
| Supabase/database/auth | `supabase`, `supabase-postgres-best-practices`; plus `security-guidance` (auth/RLS/secrets are mandatory security contexts) | Schema, migrations, RLS, Edge Functions. |
| Cloudflare/deployment | `cloudflare`, `wrangler`, `workers-best-practices`, `web-perf`, `cloudflare-deploy` | `cloudflare-deploy` only when an actual deployment workflow runs; `wrangler` requires the `wrangler` CLI. |
| GitHub/Git | `github`, `gh-cli` | `gh-cli` is the default secure-CLI workflow for authenticated GitHub operations. |
| Testing | `vitest` (unit/integration), `playwright` (browser/E2E) | Mandatory when tests are created/modified or a testing acceptance criterion exists (gate rule 8). |
| Security | `security-guidance`, `securability-engineering`, `agent-security-audit`, `mcp-server-review`, `semgrep`, `supply-chain-risk-auditor`, `secure-workflow-guide`, `codeql` | Load per gate rule 7. `semgrep`/`codeql` need their CLIs (absent on host). `secure-workflow-guide` targets smart-contract workflows — load only if actually applicable. |
| Payments/licensing | `security-guidance`, `securability-engineering`, `supply-chain-risk-auditor` | No dedicated payment/licensing skill installed; security + dependency guidance covers payment code paths. |
| Documentation/release | `github`, `gh-cli` | No dedicated documentation/release skill installed; GitHub release automation is the relevant guidance. |
| Discovery | `find-skills` | Load only when a genuinely uncovered domain appears; use for discovery, never as a blanket reason to load/install skills. |

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

### 33. `insecure-defaults` — NOT INSTALLED
Source: `trailofbits/skills`
Purpose: detect unsafe default configurations.
Status: NOT AVAILABLE as a standalone skill — `trailofbits/skills` ships it only as a Claude Code plugin (`plugins/insecure-defaults/.claude-plugin/plugin.json`, no `SKILL.md`); the `skills` CLI reports "No matching skills found" even with `--full-depth` (see `progress/SKILLS.md`). Do not treat it as installed or loadable; use `security-guidance`/`codeql`/`semgrep` instead.

### 34. `codeql`
Source: `trailofbits/skills`
Purpose: deeper static analysis where appropriate.

## Installed skill inventory

Registry state 2026-09-14: **32 external skills installed** under `~/.agents/skills/` (verified per `progress/SKILLS.md`). "Trigger" is the domain/context where the skill is loaded per the matrix; "Run with" lists the external tooling required to actually execute the skill, if any. No skill may be loaded outside its trigger context unless the gate record explains why.

| Skill | Trigger domain(s) | Run with |
| --- | --- | --- |
| `find-skills` | Discovery | none |
| `shadcn` | Frontend/UI | `shadcn` npm package (project dependency) |
| `react` | React/TypeScript | none |
| `vercel-react-best-practices` | React/TypeScript | none |
| `vercel-composition-patterns` | React/TypeScript | none |
| `frontend-design` | Frontend/UI, Accessibility/design | none |
| `web-design-guidelines` | Frontend/UI, Accessibility/design | none |
| `frontend-accessibility` | Accessibility/design | none |
| `tauri` | Tauri | none |
| `tauri-development` | Tauri | none |
| `tauri-setup` | Tauri (toolchain/prerequisites) | none |
| `rust-engineer` | Rust | none |
| `rust-review` | Rust (review/hardening) | none |
| `supabase` | Supabase/database/auth | `supabase` CLI (preferred) or Supabase MCP |
| `supabase-postgres-best-practices` | Supabase/Postgres | none |
| `cloudflare` | Cloudflare/deployment | none |
| `wrangler` | Cloudflare/deployment | `wrangler` CLI |
| `workers-best-practices` | Cloudflare/deployment | none |
| `web-perf` | Cloudflare/deployment, web performance | none |
| `cloudflare-deploy` | Cloudflare deployment workflow | `wrangler` + Cloudflare auth |
| `github` | GitHub/Git | `gh` CLI |
| `gh-cli` | GitHub/Git | `gh` CLI |
| `playwright` | Testing | `playwright` package/CLI |
| `vitest` | Testing | `vitest` (project dependency) |
| `security-guidance` | Security (ASVS-aligned guidance) | none |
| `securability-engineering` | Security (secure-by-default generation; auth/payment/input/API components) | none |
| `agent-security-audit` | Security (agent configs, CLAUDE.md, MCP configs) | none |
| `mcp-server-review` | Security (MCP servers/configurations) | none |
| `semgrep` | Security (static analysis) | `semgrep` CLI (NOT installed on host) |
| `supply-chain-risk-auditor` | Security (dependency/supply chain) | none |
| `secure-workflow-guide` | Security (smart-contract workflow) | Slither/Foundry — not applicable to Soravo; load only if actually relevant |
| `codeql` | Security (deep static analysis) | `codeql` CLI (NOT installed on host) |

Not installed: `insecure-defaults` (see registry note above). TestSprite is an MCP testing service, not a skill (see `08_MCP_AND_AGENT_TOOLING.md`).

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
