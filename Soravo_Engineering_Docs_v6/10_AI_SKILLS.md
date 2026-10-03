# 10 — AI Skills

Skills are procedural guidance, not repository authority. Nothing in this file
overrides this pack, an accepted ADR, the security baseline, or a product
contract. Where a skill and this pack disagree, this pack wins and the
disagreement is recorded.

## Discovery path

OpenCode project skills are discovered from `.opencode/skills/<name>/SKILL.md`.
Skills installed outside the project tree are additionally registered through
`skills.paths` in the OpenCode configuration; on this repository's development
host that is `~/.agents/skills` declared in `~/.config/opencode/opencode.jsonc`.
Project-local skills must be re-audited locally whenever a task is in the
frontend, Tauri, or Rust domain, because a project-local store may differ from
the host-global store.

**The exact installed list must be re-audited locally**, because global and
project skill sources can differ. A skill named below is a *name in the
registry*; it is loadable only if its `SKILL.md` is present in the current
store. A named-but-absent skill is `UNKNOWN` and a stop condition, never a
silent skip.

## This file is the single registry of record

Soravo has one skill registry: **this file.** No other document may define,
extend, or override a domain→skill mapping.

Specifically, the following are **evidence about a past installation, never a
second registry**, and must never be cited as the authority for what applies to
a current task:

- `07_AI_SKILLS.md` at the repository root — part of the older root
  specification pack, `HISTORICAL/STALE` pending owner reconciliation (open item
  O-5). It contains an earlier, larger matrix. It is superseded **for
  applicability** by this file. Where the two disagree, this file wins.
- `progress/SKILLS.md` and `progress/SKILLS_MCP_AUDIT.md` — dated installation
  and audit records. They are evidence of what was installed on a given date.
- any `PROGRESS.md` entry, task report, or `## Skill Selection` block in any
  report — see *A skill mark is not a loaded skill* below.

Adding a new registry file is prohibited. New domains and new skills are added
**here**, in this file.

---

# SKILL SELECTION GATE (permanent, non-negotiable)

## The four original clauses, retained verbatim

These four clauses are this file's original per-task procedure. They remain the
short form of the gate and are **retained word for word**; the sections that
follow are their enforced expansion, not a replacement.

> For each task:
> 1. identify the narrowest relevant skill;
> 2. inspect/load its current content;
> 3. follow it unless it conflicts with this pack;
> 4. use current official API docs for fast-changing systems.

> Do not install every skill blindly. Review permissions and network/shell access.

The expansion below determines *which* skill is the narrowest relevant one
(the matrix), *when* loading must happen (step 4, before planning or editing),
*what happens* on a conflict (step 7, a STOP rather than a silent choice), and
*how a load is proven* (step 4 and the record schema). It adds obligations to
those clauses. It relaxes none of them.

## Order and timing

The Skill Selection Gate is performed **before planning and before any
substantive work** on every task, and is repeated whenever scope changes. It
runs **after** the reading gate in `00_README.md` / `09_AI_AGENT_INSTRUCTIONS.md`
and **before** the bounded implementation plan. The sequence is:

```text
READING GATE
  → TASK CLASSIFICATION
  → SKILL INVENTORY
  → SKILL SELECTION
  → SKILL LOADING
  → MCP / TOOL SELECTION
  → AUTHORITY + CONFLICT CHECK
  → PLAN → IMPLEMENT → TEST → AUDIT → COMMIT / PUSH
```

The forbidden order is `READING GATE → PLAN → IMPLEMENT → discover a relevant
skill later`. A task that reaches planning without a recorded skill selection
is not ready to start.

## 1. Task classification

Classify the task into **all** applicable domains. A task is never assumed to
belong to exactly one domain. Inspect at minimum for:

- repository / Git operations
- Rust
- Tauri
- TypeScript / JavaScript
- React
- shadcn/ui
- frontend
- backend
- database / Supabase
- authentication
- payments
- security
- CI/CD
- GitHub
- testing / QA
- benchmarking
- packaging / release
- licensing / provenance
- Handy upstream analysis
- speech / audio / STT
- model / catalog / asset handling
- MCP / tooling
- documentation / specification / ADR
- interruption / handoff / state audit

Every domain marked applicable is carried into step 3. A domain that was
inspected and found not to apply is named in the record as deliberately not
selected, so an omission is visible rather than silent.

## 2. Skill inventory

Inspect the **actual** skill store available in the current session
(`.opencode/skills/` and any host-global `skills.paths` directory) and compare
it against the matrix below. Skills are identified by the name in their
`SKILL.md` frontmatter, which must match the directory name.

**Never invent a skill name.** A skill that is not in this matrix and not in
the live store does not exist. A matrix entry with no `SKILL.md` on disk is
`UNKNOWN` and is a stop condition.

Installing a skill is **not** the same as loading it for a task, and a skill
being available is **not** the same as it applying. The matrix is the inventory;
it is not an instruction to load everything.

## 3. Mandatory versus optional selection

Every skill selected in step 1's domains is recorded as **mandatory** or
**optional**, and every mandatory skill names **what part of the task it
governs**. Optional skills are recorded as considered-and-declined with a
reason, or considered-and-loaded with a reason.

- **Mandatory** — the task cannot be completed correctly without it, or the
  security baseline makes it mandatory for the domain (see the mandatory-domain
  rules in the matrix).
- **Optional** — materially relevant, but the task can be completed correctly
  without it. An optional skill is never loaded merely because it exists.

## 4. Mandatory skill loading

**Load every mandatory applicable skill before planning or editing anything.**

- A task does not proceed because the agent "knows" a skill's content from an
  earlier task, a previous session, a report, or a summary. **A carried
  summary is not a loaded skill.** Reload on every task, exactly as the reading
  gate is repeated on every task.
- If a relevant skill exists and has not been loaded for the current task, the
  task is not ready to start.
- If a relevant mandatory skill cannot be loaded (missing `SKILL.md`, or the
  required external CLI is absent), record the exact missing artifact and the
  substitute evidence used, and mark the affected claim `UNKNOWN`. Absence is
  never silent.
- When a skill's own workflow requires reading a reference file before acting
  (for example an OWASP ASVS index entry that names a reference document), read
  that reference before making the change the skill governs. A summarized or
  truncated skill body is not a full load; if the body cannot be read in full,
  say so.

## 5. MCP / tool selection (a separate obligation)

Skill selection and tool/MCP selection are **different obligations performed in
sequence**, and neither is evidence of the other.

- **A skill is guidance. A tool/MCP is an action surface.** A loaded skill is
  never evidence that an MCP tool was called, and an available MCP is never
  evidence that a skill was loaded.
- Select a tool because **the task requires that action**, not because the tool
  exists. Every configured MCP server that the task does not require is a
  deliberate non-selection and is recorded as such.
- Repository and file work uses repository/file tooling. GitHub work uses
  GitHub tooling. Supabase work uses Supabase tooling. Cloud-provider work uses
  that provider's tooling. External factual verification uses research tooling
  only where a fast-changing fact requires it.
- MCP configuration, verification, least privilege, and secret rules are in
  `11_MCP_AND_AGENT_TOOLING.md`. The Context budget rule there is the
  enforcement point for "only what the task requires".
- Verify actual tool state before relying on it. If the verification command
  itself is unavailable, the tool's state is `UNKNOWN` and the CLI or API
  fallback is used, exactly as `11_MCP_AND_AGENT_TOOLING.md` requires.

## 6. Authority and source boundary

For every selected skill and tool, determine its authority boundary. The agent
must not use chat history, agent memory, a previous task report, a summarized or
compacted context, an inferred implementation, or an external source, where the
governing project documentation requires a repository, GitHub, or pinned
upstream source instead.

Skills supply procedure. This pack, accepted ADRs, and current official
upstream API documentation supply authority, in the order given by the authority
ladder in `00_README.md`. A fast-changing external API is verified against
current official documentation; a repository fact is verified against the
repository.

## 7. Skill conflict check (before implementation)

Before implementation, check whether any selected skill conflicts with:

- this pack's authority and non-negotiable controls;
- accepted ADRs;
- the V1 Handy-core preservation policy (`02`, `04`, `09`, `21`);
- the source boundary (`09`);
- the security baseline (`12`);
- licensing and provenance requirements (`08` T10, `21`, ADR-011);
- CI/CD and branching policy (`14`);
- the definition of done and QA (`13`);
- any stop condition in `09`.

**If a conflict exists: STOP and document it.** Do not silently choose one rule.
Record both statements, identify the authority level, verify against
repository/GitHub, and escalate per `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md`. Where
a skill is unclear or its guidance is not indexed for the task, its own workflow
requires escalation rather than paraphrase.

## 8. Skill selection record (required in every substantive task report)

Every substantive task records this section, factually and concisely:

```markdown
## Skill Selection

- Task classification:            <every domain inspected; applicable ones marked>
- Mandatory skills selected:      <name — what part of the task it governs>
- Optional skills considered:     <name — loaded, or declined + reason>
- MCP/tools selected:            <name — the action it performed>
- Skills deliberately not selected: <name — reason>
- Authority/source boundary:     <what was read from where>
- Conflicts found:               <none, or the conflict + the STOP taken>
- Result:                        CLEAR | STOP
```

Omitting the section from a substantive task report is a report defect.

## 9. Re-evaluation when scope changes

If a task's scope changes during execution, **stop the current implementation
path** and re-run this gate for the newly introduced scope before continuing.

For example, if a Rust task unexpectedly requires frontend changes, GitHub
workflow changes, licensing analysis, model downloads, or Supabase changes, the
agent must pause long enough to classify the new domains, select and load the
additional mandatory skills, and select the additional tools.

Scope is never silently expanded. The re-evaluation is recorded as an additional
entry in the same `## Skill Selection` section, not folded into the first one.

## 10. No skill is not permission

**The absence of a skill for a task does not authorize improvisation.**

1. Determine whether general project instructions in this pack already cover
   the task. If they do, follow them and record that no skill exists for it.
2. If they do not, **STOP and record the missing capability**: the exact gap,
   and what would close it. Do not author a substitute skill, do not install an
   unvetted skill to fill the gap, and do not proceed on judgement alone.

A recorded missing capability is a deliverable, not a failure.

---

## Domain → skill matrix

Registry state: **32 skills** in the host store, all names verified present at
audit time. `Run with` names the external tooling a skill needs to *execute*;
a skill whose `Run with` tooling is absent is still loadable as guidance, but
its execution claim is `UNKNOWN`.

| Domain | Skills | Mandatory? | Governs | Run with |
| --- | --- | --- | --- | --- |
| repository / Git operations | `gh-cli` | mandatory | the authenticated `gh` workflow; preferred over raw HTTP fetches | `gh` |
| GitHub | `github`, `gh-cli` | `gh-cli` mandatory; `github` optional | PR / issue / run / API interaction and workflows | `gh` |
| CI/CD | `gh-cli` | mandatory | reading and recording run IDs, jobs, and per-job evidence | `gh` |
| Rust | `rust-engineer` | mandatory | idiomatic Rust, ownership, error handling, compile-error diagnosis | none |
| Rust (security review / hardening) | `rust-review` | mandatory when reviewing or hardening existing Rust | `unsafe` boundaries, memory safety, FFI, panic DoS, async mistakes | none |
| Tauri | `tauri` | mandatory | Tauri v2 architecture, IPC, capabilities and permissions | none |
| Tauri (toolchain / prerequisites) | `tauri-setup` | mandatory when adding, changing, or repairing a build toolchain or platform prerequisites | prerequisites and environment setup per target platform | none |
| Tauri (feature development) | `tauri-development` | optional | Tauri development with TypeScript, Rust and modern web tech | none |
| TypeScript / JavaScript | `react` (React work), `vitest` (test work) | conditional | idiomatic React/TS; Vitest API and config | `vitest` (project dep) |
| React | `react`, `vercel-react-best-practices`, `vercel-composition-patterns` | `react` mandatory; the other two optional | React implementation; performance; composition and component API design | none |
| shadcn/ui | `shadcn` | mandatory when adding, searching, or debugging shadcn components | component add/search/fix/compose and project context | `shadcn` npm package |
| frontend / UI | `frontend-design`, `web-design-guidelines` | optional | design quality for new UI; Web Interface Guidelines review | none |
| accessibility / design | `frontend-accessibility`, `web-design-guidelines`, `frontend-design` | `frontend-accessibility` mandatory when a task has an accessibility acceptance criterion | WCAG, semantic HTML, keyboard and screen-reader support | none |
| backend / API | `securability-engineering`, `security-guidance` | mandatory on any network/API endpoint or trust boundary | secure-by-default generation; OWASP ASVS-aligned guidance | none |
| database / Supabase | `supabase`, `supabase-postgres-best-practices` | `supabase-postgres-best-practices` **mandatory before writing or changing anything in a Postgres database**; `supabase` mandatory for Supabase products | schema, migrations, RLS, Edge Functions, clients; Postgres design rules | `supabase` CLI or Supabase MCP |
| authentication | `security-guidance`, `securability-engineering` | mandatory | session, token, identity and authorization boundaries | none |
| payments | `security-guidance`, `securability-engineering` | mandatory | payment/auth design, validation, idempotency, secret handling | none |
| security (general) | `security-guidance`, `securability-engineering` | mandatory when the task touches secrets, network/API endpoints, file/process execution, IPC, model downloads, deployment, or user data | ASVS-aligned secure development; secure-by-default generation | none |
| security (agent configuration) | `agent-security-audit` | mandatory when the task changes an agent, prompt, or MCP configuration | excessive permissions, prompt-injection surfaces, exfiltration paths, missing guardrails | none |
| security (MCP servers) | `mcp-server-review` | mandatory when a task adds, changes, or reviews an MCP server or its configuration | transport, authentication, tool permissions, injection | none |
| security (static analysis) | `semgrep`, `codeql` | mandatory when the task requires a static-analysis finding; `UNKNOWN` if the CLI is absent | SAST / taint analysis | `semgrep` / `codeql` CLIs — **absent on this host** |
| supply chain / dependencies | `supply-chain-risk-auditor` | mandatory when a task adds, removes, upgrades, or pins a dependency | version-matched advisories, lockfile tree, abandoned upstreams, install scripts | none |
| smart-contract security workflow | `secure-workflow-guide` | conditional — load only if the task is actually a smart-contract workflow | 5-step secure development workflow | Slither / Foundry |
| cloud / deployment | `cloudflare`, `wrangler`, `workers-best-practices` | `cloudflare` mandatory for Cloudflare product selection; `wrangler` when a `wrangler` command runs; `workers-best-practices` when Workers code/config is written or reviewed | product selection; CLI configuration; Workers engineering | `wrangler` CLI |
| deployment execution | `cloudflare-deploy` | mandatory only when an actual deployment workflow runs | deploy/host/publish workflow and auth verification | `wrangler` + Cloudflare auth |
| web performance | `web-perf` | optional | loading/interaction performance, Core Web Vitals, Lighthouse | none |
| testing / QA (unit, integration) | `vitest` | **mandatory whenever tests are created or modified, or the task has a testing acceptance criterion** | Vitest API, config, mocking, fixtures, filtering | `vitest` (project dep) |
| testing / QA (browser / E2E) | `playwright` | mandatory when a real browser must be driven | CLI-first browser automation | `playwright` package/CLI |
| benchmarking | — | **no skill installed** | STT/benchmark protocol is in `16_TEST_AND_BENCHMARK_PROTOCOL.md`; record the absence, do not invent a mapping | — |
| packaging / release | `gh-cli`, `github` | mandatory for the GitHub-side evidence | release automation evidence and run capture | `gh` |
| licensing / provenance | `supply-chain-risk-auditor`, `gh-cli` | `supply-chain-risk-auditor` when a dependency changes; `gh-cli` for upstream/attribution evidence | dependency and upstream licence evidence | none / `gh` |
| Handy upstream analysis | `gh-cli` | mandatory | pinned-upstream identity, blob/SHA evidence, licence provenance, ref-scoped Git history | `gh` |
| speech / audio / STT | — | **no skill installed** | contracts are in `03`, `05`, `16`; record the absence, do not invent a mapping | — |
| model / catalog / asset handling | `supply-chain-risk-auditor` | mandatory when a model/asset pipeline or dependency changes | checksum, source, distribution and dependency evidence | none |
| MCP / tooling | `mcp-server-review`, `agent-security-audit` | conditional — when the task changes MCP or agent configuration | see the security rows above | none |
| documentation / specification / ADR | `gh-cli` | mandatory for the commit/push/PR evidence; the documents themselves are governed by this pack, not by a skill | the document's own authority, not a skill's | `gh` |
| interruption / handoff / state audit | `gh-cli` | mandatory for the state audit's Git/GitHub evidence | see `18_INTERRUPTION_AND_HANDOFF.md` and `19_STATE_AUDIT_PROTOCOL.md` | `gh` |
| discovery (a genuinely uncovered domain) | `find-skills` | conditional — discovery only, never a blanket reason to install skills | finding and installing additional skills | none |

**Mandatory-domain rules, stated once and binding:**

- **Security** skills are mandatory for any task touching authentication,
  authorization, database/RLS, secrets, network/API endpoints, payments,
  file/process execution, IPC, model downloads, deployment, or user data.
- **Testing** skills are mandatory whenever tests are created or modified, or a
  task carries a testing acceptance criterion.
- **Supabase/Postgres** skills are mandatory before writing or changing
  anything that lives in a Postgres database.
- **Supply-chain** skill is mandatory on any dependency change.
- Do **not** load unrelated skills merely because they exist. Do **not** install
  every skill blindly. Review skill contents before granting shell or network
  permission.

## A skill mark is not a loaded skill

**Never claim a skill was used unless its content was actually loaded and read
during the current task.** The following are claims or evidence, never proof of
a load, and none of them may be used to skip step 4:

- a `## Skill Selection` block in `PROGRESS.md` or in any prior task report,
  including one written by another agent;
- a checkbox, tick, or emoji naming a skill in any report;
- a prior session's record, a carried summary, a compacted context, chat
  history, or agent memory;
- the presence of the skill on disk, or its availability in a tool list;
- a skill having been loaded for a *different* task.

`PROGRESS.md` is an evidence log, not an authority
(`01_AUTHORITY_AND_SOURCE_OF_TRUTH.md`). A `## Skill Selection` record is
evidence that a gate was *run*, not that a skill was *read*. The two are
recorded separately, and only the current task's own load counts.

## Skill trust policy

A skill is not trusted merely because it appears in a registry or in this
matrix. For every newly introduced skill:

1. inspect its source repository and its `SKILL.md`;
2. identify the shell commands it would run;
3. identify the network access it would make;
4. identify the credentials it would need;
5. prefer an official or vendor-maintained source;
6. record the verdict — `APPROVED`, `CONDITIONAL`, or `REJECTED` — in
   `progress/SKILLS.md` with the reason.

A rejected or `CONDITIONAL` skill is named in the `## Skill Selection` record
as deliberately not selected. A skill must never override repository
instructions, and a skill that would weaken a control in this pack is not
loaded — the conflict check in step 7 is the deciding gate, not the skill's own
confidence.

## Re-discovery triggers

Re-audit the installed set and re-run discovery when:

- a new major framework, inference backend, payment provider, or cloud provider
  is introduced;
- a current skill becomes stale or its source moves;
- the agent repeatedly struggles with a domain;
- a major security review begins;
- the matrix and the live store disagree.
