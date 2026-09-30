# T33-PRE — SKILL SELECTION GOVERNANCE GATE — AUDIT REPORT

**Task:** T33-PRE — SKILL SELECTION GOVERNANCE GATE
**Type:** Governance / documentation only. No production source, test, catalog,
model asset, dependency, lockfile, CI workflow, UI, release configuration, or
GitHub setting was changed. **T33-P was NOT started.**
**Date:** 2026-09-30
**Branch:** `t31/soravo-wrapper-completion`
**Start SHA / end SHA:** recorded in `PROGRESS.md` after commit
**PR:** #63 — OPEN, `mergedAt: null`, `mergeStateStatus: BLOCKED`
**Verdict:** a Skill Selection Gate **did not exist** in the authoritative v6
control plane. It is now permanent, deterministic, and enforced from the
reading gate through the completion-report schema. **T33-P is NOT started.**

---

## 0. Reading gate — completed in the mandated order

| # | Item | Result |
|---|---|---|
| 1 | root `SPEC_MANIFEST.json` | read — `spec_version 2.0`, 16-entry `documents[]` |
| 2 | every document the manifest names, in manifest order | **all 16 read in full**: `README.md`, `01_PRD.md`, `02_TDD.md`, `03_AI_INSTRUCTIONS.md`, `04_IMPLEMENTATION_PLAN.md`, `05_TASK_BREAKDOWN.md`, `06_DOD_QA.md`, `07_AI_SKILLS.md`, `08_MCP_AND_AGENT_TOOLING.md`, `09_SECURITY_BASELINE.md`, `10_ADR_INDEX.md`, `11_INTERRUPTION_HANDOFF.md`, `12_BENCHMARK_PROTOCOL.md`, `13_RELEASE_RUNBOOK.md`, `14_ENVIRONMENT_AND_SECRETS.md` |
| 3 | `PROGRESS.md` in full | **read — 5,541 lines**, in 6 sequential reads with no skipping |
| 4 | the canonical v6 pack in full | **read** — canonical path `docs/Soravo_Engineering_Docs_v6/`, all 24 manifest entries in read order: `00`–`21`, `DESIGN.md`, `SPEC_MANIFEST.json` |
| 5 | `10_AI_SKILLS.md` in full | read — **both** trees (canonical and root mirror, byte-identical pre-change) |
| 6 | `11_MCP_AND_AGENT_TOOLING.md` in full | read — both trees |
| 7 | `09_AI_AGENT_INSTRUCTIONS.md` in full | read — canonical v6 (291 lines) **and** root `03_AI_INSTRUCTIONS.md` (366 lines, the v2 equivalent) |
| 8 | `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` in full | read — canonical v6 (98 lines) |
| 9 | `12_SECURITY_BASELINE.md` | read — both trees |
| 10 | `13_DEFINITION_OF_DONE_AND_QA.md` | read — canonical v6 |
| 11 | `14_CI_CD_AND_BRANCHING.md` | read — canonical v6 |
| 12 | `16_TEST_AND_BENCHMARK_PROTOCOL.md` | read — canonical v6 |
| 13 | `18_INTERRUPTION_AND_HANDOFF.md` | read — both trees |
| 14 | `19_STATE_AUDIT_PROTOCOL.md` | read — canonical v6 |
| 15 | `20_ADR_INDEX.md` | read — both trees (canonical = index of record) |
| 16 | fresh GitHub state | see §2 |
| 17 | T33-O report | read — `T33-O-POST-T33-N-CI-BASELINE-AND-HANDY-READINESS-AUDIT.md`, 692 lines, including §7 (T33-P rationale and non-goals) |

Additionally read because the audit depends on them: `Soravo_Engineering_Docs_v6/00_README.md`
and `20_ADR_INDEX.md` (the two banner-bearing mirror files, to preserve the
canonical/mirror invariant), `progress/SKILLS.md`, `progress/MCP.md`,
`.github/workflows/ci.yml`, `.github/workflows/release.yml`,
`~/.config/opencode/opencode.jsonc`, and the `SKILL.md` of every skill named in
the new registry.

**No prior report's conclusion was accepted on report.** Every skill-presence
claim, every name-coverage claim, and every CI/PR fact below was re-derived
first-hand from the filesystem, the live skill store, and the GitHub API.

### Authority chain established (not assumed)

`docs/Soravo_Engineering_Docs_v6/` is the canonical pack and the index of
record (v6 `00_README.md` *Duplicate pack copies*, three independent bases). The
root `Soravo_Engineering_Docs_v6/` is a **non-authoritative mirror**. The root
v2 pack (`SPEC_MANIFEST.json` + `01_PRD.md` … `14_ENVIRONMENT_AND_SECRETS.md`)
is `HISTORICAL/STALE` pending owner item **O-5**, which is still open. Two
manifests exist and both were read; the v6 manifest governs.

---

## 1. Fresh state audit (this session, before any edit)

| Field | Value |
|---|---|
| Local HEAD | `e2e2c2c323de49db08db84a57df5b4968d8b68fe` |
| Upstream | `origin/t31/soravo-wrapper-completion` — **0 ahead / 0 behind** |
| `origin/main` | `ede495b55efd95cedd882d90a19d12b4777da852` |
| Worktree at start | **0 tracked modifications**; **36 untracked paths, all pre-existing** (31 prior-task `T*.md` reports + `apps/desktop/.env.example` + `apps/desktop/src-tauri/tauri.toml` + `deno.lock` + `docs/archive/spec-v3/spec-v3/` + `reports/`) |
| Worktrees | 1 main + 3 in `.swarm-worktrees/` — untouched |
| `git diff --check` (pre-change) | **exit 0** |
| PR #63 | **OPEN** · head `e2e2c2c3` **identical to local HEAD** · `mergeable: MERGEABLE` · `mergeStateStatus: BLOCKED` · `reviewDecision: REVIEW_REQUIRED` (0 of 1) · `mergedAt: null` |
| PR checks (all 7) | `web` pass · `e2e` pass · `rust` pass · `desktop` pass · `npm-audit` pass · `cargo-audit` pass · `cargo-deny` pass |
| Latest CI | **`36677713859`** — `completed` / **`success`**, 11m28s, head `e2e2c2c3` |
| Latest Security Audit | **`36677713913`** — `completed` / **`success`**, 46s, head `e2e2c2c3` |
| `release.yml` runs | **0, ever** · `gh release list` **empty** |
| Branch protection (`main`) | required contexts `[web, e2e, rust, desktop]`, `strict: true`, `required_approving_review_count: 1`, `allow_force_pushes: false`, `allow_deletions: false` — read-only |
| Host | Linux `x86_64`, rustc 1.97.1, node 22.23.1, pnpm 11.17.0, gh 2.100.0, `supabase` CLI present |
| `rustup target list --installed` | **`x86_64-unknown-linux-gnu` only** → macOS/Windows are `UNKNOWN` on this host |
| `opencode` CLI | **not on `PATH`** → `opencode --version` and `opencode mcp list` are **`UNKNOWN`**, not inferred (v6 `19` requires them) |

**Correction to `PROGRESS.md`, recorded not rewritten.** `PROGRESS.md:5516`
names `f5dca2e4` as the "final head for the next agent". The real head is
**`e2e2c2c3`** — one further T33-O Markdown-only commit
(`docs(t33-o): correct final-head pointer and record CI on f5dca2e4`) exists and
carries green CI (`36677713859` / `36677713913`). The line is inside a T33-O
historical entry and is **not** rewritten, per the file's own precedent.

---

## 2. CURRENT REPOSITORY AUDIT — questions A to I, answered from the repository

### A. Does `10_AI_SKILLS.md` already contain a skill-selection gate?

**NO — and the file is 15 lines.** Canonical
`docs/Soravo_Engineering_Docs_v6/10_AI_SKILLS.md` in full, pre-change, is
15 lines / 916 bytes. Its entire per-task procedure is:

```text
For each task:
1. identify the narrowest relevant skill;
2. inspect/load its current content;
3. follow it unless it conflicts with this pack;
4. use current official API docs for fast-changing systems.
```

Grep-verified absences in that file: `mandator*` **0**, `classif*` **0**,
`matrix` **0**, `before plan` **0**, `re-evaluat*` **0**, `record` **0** (the
single `conflict` hit is clause 3, "follow it unless it conflicts with this
pack", with no stop, no escalation, and no authority list).

Absent: task classification, a skill inventory, mandatory/optional, a record
requirement, a conflict-check procedure, re-evaluation on scope change, the
no-skill rule, any ordering anchor relative to planning, a trust policy, and any
statement that a registry entry is not a substitute for the actual `SKILL.md`.

Its only inventory statement is *"Known skill families from the supplied audit
include:"* followed by 18 names and the words "and generated/supporting skills".

### B. Does `09_AI_AGENT_INSTRUCTIONS.md` require skill selection?

**PARTIALLY — two lines, no gate.** `grep -n skill` on the canonical
`09_AI_AGENT_INSTRUCTIONS.md` returns exactly **2** hits:

- `:147` — step 7 of *Mandatory first sequence*: `load the narrowest applicable skill;`
- `:180` — step 3 of *Search-before-abstraction*: `inspect applicable skills;`

The **ordering is already correct** — step 7 sits between the state audit and
`write a bounded implementation plan` (step 9) / `implement minimally` (step 10).
What is missing is everything that makes the step enforceable: no definition, no
inventory reference, no mandatory/optional distinction, no record, no STOP, no
re-evaluation, no prohibition on carrying a skill across tasks, and no entry in
the *Completion report schema*. The file has no `Skill Selection` section at
all, and `grep -rni "skill selection"` across the entire canonical pack returns
**0 hits**.

### C. Does `11_MCP_AND_AGENT_TOOLING.md` connect skills to tools/MCPs?

**NOT EXPLICITLY — the connection exists only outside the canonical plane.**
`grep -ni skill` on the canonical `11` returns **3** hits, all about *where
skills are stored* (`:51` the `.opencode/skills/<skill-id>/SKILL.md` path, `:53`
the path itself, `:59` an `opencode.ai/docs/skills` URL). There is **no** statement
that skill selection and tool selection are different obligations, and no
statement that one is never evidence of the other.

`11` does contain a strong *Context budget rule* — "Only enable the MCP servers
needed for the current task" — which is adjacent to requirement 4 but is not a
gate step and says nothing about skills.

The explicit separation rule **does exist** — but only in the
`HISTORICAL/STALE` root pack: `03_AI_INSTRUCTIONS.md:107` and
`07_AI_SKILLS.md:24` both state that MCP availability is never evidence a skill
was loaded and vice versa. The canonical pack had no equivalent.

### D. Are there actual skill files/definitions available to OpenCode?

**YES — 32, host-global, 0 project-local.** Verified this session:

```text
~/.agents/skills/<name>/SKILL.md        32 directories
~/.config/opencode/opencode.jsonc:9     "skills": { "paths": ["~/.agents/skills"] }
.opencode/skills/                       ABSENT
.agents/skills/                         ABSENT
```

The live session's own skill tool lists the same **32** names, plus one
built-in (`customize-opencode`, `<built-in>` location, not an external skill).
There is **no project-local skill store**, so the project-specific discovery
path that `10_AI_SKILLS.md` documents is currently empty and the host-global
store is the whole inventory. That is a material fact the old registry did not
record anywhere in the canonical pack.

### E. Are the skill names referenced by the governance documents actually present?

**Yes — 0 dangling references. The problem is the opposite: a 14-skill coverage gap.**

Deterministic comparison of the canonical `10`'s named set against the live
store:

| Measure | Value |
|---|---|
| Installed in `~/.agents/skills` | **32** |
| Named by canonical `10_AI_SKILLS.md` (pre-change) | **18** |
| Named but **NOT** installed (dangling) | **0** |
| Installed but **NOT** named (coverage gap) | **14** |

The 18 named: `agent-security-audit`, `cloudflare`, `cloudflare-deploy`,
`github`, `react`, `rust-engineer`, `securability-engineering`,
`security-guidance`, `shadcn`, `supabase`,
`supabase-postgres-best-practices`, `tauri`, `tauri-development`, `tauri-setup`,
`vitest`, `web-design-guidelines`, `workers-best-practices`, `wrangler`.

The 14 **invisible to the canonical pack**: `codeql`, `find-skills`,
`frontend-accessibility`, `frontend-design`, **`gh-cli`**, `mcp-server-review`,
`playwright`, **`rust-review`**, `secure-workflow-guide`, `semgrep`,
`supply-chain-risk-auditor`, `vercel-composition-patterns`,
`vercel-react-best-practices`, `web-perf`.

`gh-cli` and `rust-review` are bolded because they are **both directly
applicable to T33-P** and neither is named in the canonical registry. An agent
working strictly from the canonical pack could not have discovered them.

The root `07_AI_SKILLS.md` names 33 required skills and correctly marks exactly
one as not installable (`insecure-defaults`, absent from the store, absent from
its 32-skill claim). Its inventory matches the live store exactly.

### F. Are there duplicate or conflicting skill registries?

**YES — four locations, no precedence rule, and a coverage inversion.**

| Location | Lines | Content | Declared status |
|---|---|---|---|
| `docs/Soravo_Engineering_Docs_v6/10_AI_SKILLS.md` | 15 | 18-name "known families" list; no matrix, no inventory, no gate | **canonical, index of record** |
| `Soravo_Engineering_Docs_v6/10_AI_SKILLS.md` | 15 | byte-identical mirror of the above | non-authoritative mirror |
| `07_AI_SKILLS.md` (root v2 pack) | **361** | full domain→skill matrix, 32-skill installed inventory, trust policy, mandatory security/testing rules, re-discovery triggers | `HISTORICAL/STALE` (O-5 open) |
| `progress/SKILLS.md` | 55 | dated install record: "32 of 33 required skills are INSTALLED" | evidence only; not in the v6 read order |
| `progress/SKILLS_MCP_AUDIT.md` | 225 | installation + MCP baseline audit | evidence only; not in the v6 read order |

**The inversion, stated plainly:** the only complete skill governance in this
repository is in the file the canonical pack declares `HISTORICAL/STALE` and
**never references** — `grep -rn "07_AI_SKILLS" docs/Soravo_Engineering_Docs_v6/
Soravo_Engineering_Docs_v6/` returns **0 hits**. The file that *is* canonical
is a 15-line stub naming 18 of 32 installed skills.

**Are they factually contradictory?** No. Both agree that skills are procedural
guidance and not repository authority, and every name is real. The conflict is
**coverage and precedence**, not fact: 18 vs 33, with no rule saying which
governs. Under the v6 authority ladder the 18-name stub is the effective
registry. **This is a gap, not a STOP:** it is resolved by strengthening the
canonical file in place and naming its precedence, not by creating a third
registry.

### G. Is the current reading gate sufficient to force an agent to load skills before implementation?

**NO.** Three independently sufficient reasons, all verified:

1. **The gate does not contain skill loading.** The *PERMANENT READING GATE
   (non-negotiable)* block in `09` ends at step 5, "only then read
   task-specific reports". Skill loading is step 7 of a *different* list
   (*Mandatory first sequence*), which is not part of the permanent gate.
   `00`'s restated gate sequence was `PROGRESS.md` in full → state audit →
   task-specific reports, with no skill step.
2. **The rule is unanchored and undefined.** "The narrowest applicable skill"
   names no list to be narrow against, and `10`'s clause 1 is "identify the
   narrowest relevant skill" with no "before planning or editing" anchor. An
   agent can satisfy both by judging that nothing is relevant and loading zero
   skills.
3. **Nothing makes a load auditable and nothing forbids carrying one.** There is
   no record requirement, so "loaded" cannot be checked afterwards, and no rule
   stops a later task from relying on remembered content. The v6
   *what may never substitute* list correctly covers reports, chat history,
   memory, summaries and `PROGRESS.md` **for the pack** — and says nothing about
   skills.

### H. Are there places where `PROGRESS.md` could incorrectly be treated as a substitute for the actual skill definitions?

**YES — four concrete places, and the canonical pack has no rule against any of
them.**

1. **`PROGRESS.md` carries per-task `### Skill Selection Gate` blocks that assert
   skills were loaded** — e.g. `:385-390` (RAZORPAY-TEST-TOOLING-019, four ✅
   marks), `:560-564` (019B), `:644-648` (019C), `:677-681` (020), and
   `:1449-1455` (T32-F `RAZORPAY-TEST-PAYMENT-SMOKE-027`, which states
   *"`security-guidance` ✅, `supabase` ✅, `gh-cli` ✅"*). Those are **claims that
   a load happened**; the content of every one of those skills is nowhere in the
   repository.
2. **The root pack's own rule against this exists only outside the canonical
   plane.** `07_AI_SKILLS.md:22` and `:103` and `03_AI_INSTRUCTIONS.md:105`
   state *"Never claim a skill was used unless its content was actually
   loaded/read during the task"* — in the `HISTORICAL/STALE` root pack. The
   canonical pack had **no equivalent**, so under the authority ladder the
   protection did not apply.
3. **`PROGRESS.md` is explicitly barred as a substitute for the *pack*
   (`09`), but not for *skills*.** `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md:81` says
   only that `PROGRESS.md` "is not authoritative by itself". Neither file says a
   `PROGRESS.md` skill mark is not evidence of a load.
4. **The v6 `10` discovery-path claim is itself a substitution hazard.** It
   documented only `.opencode/skills/<name>/SKILL.md`, which **does not exist in
   this repository**. An agent auditing "the project's available skills" per
   that path would have found zero and concluded no skills were available.

### I. Are there any skills specifically applicable to the next T33-P task?

**Yes — verified against the live store, not assumed.** See §8 for the full
matrix. T33-P is confirmed from the repository, not from the brief alone:
`T33-O` §7 names it *"T2 macOS/Windows build verification gate (ADR-019)"*, and
canonical `20_ADR_INDEX.md:29` lists ADR-019's outstanding obligations as
**"T1 boot gate, T2 macOS/Windows build jobs, `app.tsx` truthfulness"**.
`.github/workflows/ci.yml` has 4 jobs, **all `ubuntu-latest`**
(`web`, `e2e`, `rust`, `desktop`) — confirmed by reading the file.
`SPEC_MANIFEST.json` declares `primary_platforms: ["macOS", "Windows"]`.

Applicable from the actual registry: **`tauri`** (mandatory — the new job runs
`pnpm tauri build`), **`tauri-setup`** (mandatory — its own description is
*"Guidance for Tauri v2 prerequisites and environment setup across macOS,
Windows, Linux…"*, which is exactly what adding two new runners is), **`rust-engineer`**
(mandatory — interpreting any cross-platform compile error), **`gh-cli`**
(mandatory — all PR/CI read plus commit/push), **`security-guidance`**
(mandatory — a new CI job is a security-relevant configuration change and the
existing template is `permissions: contents: read`).

---

## 3. EXISTING SKILL GOVERNANCE — what was preserved

The v6 pack already had a *partial, correct-in-spirit* governance. It was
**preserved and strengthened, not replaced**:

| Preserved element | Where it was | Disposition |
|---|---|---|
| "Skills are procedural guidance, not repository authority" | v6 `10:2` | kept verbatim in the new `10` |
| "OpenCode project skills are discovered from `.opencode/skills/<name>/SKILL.md`" | v6 `10:2` | kept, and extended with the host-global path |
| "identify the narrowest relevant skill" | v6 `10:8` | kept, as gate step 3 |
| "inspect/load its current content" | v6 `10:9` | kept, and hardened to "before planning or editing" + reload-per-task |
| "follow it unless it conflicts with this pack" | v6 `10:10` | kept, and expanded into a full conflict check with a STOP |
| "use current official API docs for fast-changing systems" | v6 `10:11` | kept, promoted into the authority/source boundary (step 6) |
| "Do not install every skill blindly. Review permissions and network/shell access." | v6 `10:13` | kept, moved into the trust policy |
| "The exact installed list must be re-audited locally" | v6 `10:15` | kept, promoted into gate step 2 |
| "load the narrowest applicable skill" | v6 `09:147` | kept inside step 7 of the mandatory first sequence |
| "inspect applicable skills" | v6 `09:180` | kept in search-before-abstraction |
| Terminology "Skill Selection Gate" | root `03_AI_INSTRUCTIONS.md:61,89` and root `07_AI_SKILLS.md:9` | **adopted** — the canonical gate uses the same name, so the historical pack's terminology becomes the canonical one rather than a competing term |
| "Installing a skill is not the same as loading it" | root `07_AI_SKILLS.md:7` | kept |
| Trust statuses `APPROVED` / `CONDITIONAL` / `REJECTED` | root `07_AI_SKILLS.md:299-302` | adopted verbatim |
| Record tokens `Selected skills:` / `Skills actually used:` | root `03_AI_INSTRUCTIONS.md:105` | superseded by the stricter `## Skill Selection` schema, which additionally records *not*-selected skills — a superset, not a contradiction |

**No competing skill system was invented.** The gate, the matrix, the record, the
trust policy and the re-discovery triggers all live in the one existing
canonical registry, `10_AI_SKILLS.md`, which now declares itself the single
registry of record.

---

## 4. ACTUAL SKILL INVENTORY (verified, 32 of 32)

Live store: `~/.agents/skills/<name>/SKILL.md`, 32 directories, registered via
`~/.config/opencode/opencode.jsonc` → `"skills": { "paths": ["~/.agents/skills"] }`.
`opencode` is **not on `PATH`**, so `opencode mcp list` is `UNKNOWN`; the store
was verified directly on the filesystem and against the session's own skill
tool listing, which reports the same 32 external names.

| # | Skill | `SKILL.md` description (first-hand) | Run with |
|---|---|---|---|
| 1 | `agent-security-audit` | audit AI agent configs: excessive permissions, prompt injection, exfiltration, missing guardrails | none |
| 2 | `cloudflare` | discover/choose Cloudflare products for apps, APIs, agents, storage, networking, security | none |
| 3 | `cloudflare-deploy` | deploy/host/publish to Cloudflare using Workers, Pages and related services | `wrangler` + Cloudflare auth |
| 4 | `codeql` | interprocedural dataflow/taint SAST; Python/JS/TS/Go/Java/Kotlin/C/C++/C#/Ruby/Swift | `codeql` CLI — **absent on host** |
| 5 | `find-skills` | discover and install agent skills when a capability is genuinely uncovered | none |
| 6 | `frontend-accessibility` | WCAG via semantic HTML, ARIA, keyboard navigation, screen readers | none |
| 7 | `frontend-design` | distinctive production-grade frontend interfaces; design quality | none |
| 8 | `gh-cli` | enforce authenticated `gh` over `curl`/`WebFetch`/MCP fetch; repos, PRs, issues, API | `gh` |
| 9 | `github` | interact with GitHub via `gh`: issues, PRs, runs, workflows, advanced API queries | `gh` |
| 10 | `mcp-server-review` | security review of MCP server implementations and configurations | none |
| 11 | `playwright` | real-browser automation from the terminal via `playwright-cli` | `playwright` package/CLI |
| 12 | `react` | expert React with modern patterns, hooks, performance | none |
| 13 | `rust-engineer` | idiomatic Rust: ownership, lifetimes, traits, async, error handling, tests | none |
| 14 | `rust-review` | Rust security review: `unsafe` boundary, memory safety, FFI, panic DoS, async | none |
| 15 | `securability-engineering` | generate/scaffold/refactor code embodying FIASSE v1.0.4 SSEM qualities | none |
| 16 | `secure-workflow-guide` | Trail of Bits 5-step secure workflow; Slither / smart-contract specific | Slither/Foundry — **not applicable to Soravo** |
| 17 | `security-guidance` | OWASP ASVS-aligned secure development; Core Principle, 4-step Workflow, Escalation, ~120-entry index | none |
| 18 | `semgrep` | Semgrep SAST with plan approval, `run all` / `important only` | `semgrep` CLI — **absent on host** |
| 19 | `shadcn` | add/search/fix/debug/style/compose shadcn components; project context | `shadcn` npm package |
| 20 | `supabase` | any Supabase task: products, clients, auth, RLS, Edge Functions, Realtime, Storage | `supabase` CLI or MCP |
| 21 | `supabase-postgres-best-practices` | Postgres rules; **load before writing/changing anything in a database** | none |
| 22 | `supply-chain-risk-auditor` | dependency risk: advisories, lockfile tree, abandoned upstreams, install scripts | none |
| 23 | `tauri` | Tauri v2 architecture, IPC, capabilities, permissions, plugins | none |
| 24 | `tauri-development` | Tauri development with TypeScript, Rust, modern web tech | none |
| 25 | `tauri-setup` | Tauri v2 **prerequisites and environment setup across macOS, Windows, Linux, mobile** | none |
| 26 | `vercel-composition-patterns` | React composition that scales; compound components, render props, React 19 | none |
| 27 | `vercel-react-best-practices` | React/Next.js performance from Vercel Engineering | none |
| 28 | `vitest` | Vitest API and config: mocking, spies, fake timers, coverage, fixtures, filtering | `vitest` (project dep) |
| 29 | `web-design-guidelines` | review UI code for Web Interface Guidelines compliance | none |
| 30 | `web-perf` | loading/interaction performance, Core Web Vitals, Lighthouse | none |
| 31 | `workers-best-practices` | Cloudflare Workers best practices for production apps | none |
| 32 | `wrangler` | run/troubleshoot Wrangler CLI; configure Worker projects | `wrangler` CLI |

**Two installed skills whose `Run with` CLI is absent:** `semgrep`, `codeql`.
Loadable as guidance; any *execution* claim from them is `UNKNOWN`. The registry
records this rather than hiding it.

**Two domains with no installed skill:** *speech/audio/STT* and *benchmarking*.
The old registry's discipline for these — record the absence, do not invent a
mapping — is kept, and their contracts are pointed at `03`, `05`, and
`16_TEST_AND_BENCHMARK_PROTOCOL.md`.

**No new pack file was created.** Adding a 25th manifest entry would break the
`24/24/24/24` invariant T32-Y established and T33-I re-verified. The gate lives
inside the existing entry 11.

---

## 5. ACTUAL MCP / TOOL INVENTORY relevant to task execution

Configuration, read from `~/.config/opencode/opencode.jsonc` (host-global; there
is **no** project `opencode.json`/`.opencode/opencode.json[c]` override):

| Server | Configured | Auth | Tools exposed in **this** session | Task-need verdict |
|---|---|---|---|---|
| `github` | `type: remote`, `https://api.githubcopilot.com/mcp/readonly`, `enabled: true` | OAuth | **NONE** | not exposed → per v6 `11` *Verification rule*, `UNKNOWN`. **Not selected**; `gh` is the correct fallback |
| `supabase` | `type: remote`, project-scoped `zbzhlhoxblguepplqppw`, features `docs,database,debugging,development`, `enabled: true` | OAuth | **PRESENT** (≈12 tools incl. `execute_sql`, `apply_migration`, `list_tables`, `query_logs`) | **deliberately NOT selected** — this task needs no database operation. Presence is not permission |
| `cloudflare` | `type: remote`, `https://mcp.cloudflare.com/mcp`, `enabled: true` | OAuth 2.1 | **PRESENT** (`cloudflare_docs`, `cloudflare_search`, `cloudflare_execute`) | **deliberately NOT selected** — no Cloudflare operation in this task |
| `testsprite` | `type: local`, `npx -y @testsprite/testsprite-mcp@latest`, `enabled: true` | `API_KEY` via `{env:TESTSPRITE_API_KEY}` | **NONE** | `UNKNOWN` (no key) and not required; v6 `11` records TestSprite as supplemental only |

**Tools actually used for this task:** repository/file tooling (`read`,
`write`, `edit`, `bash`, `search`) and the `gh` CLI, plus the session's own
`skill` tool. **Zero MCP tools were called.** Per v6 `11`, MCP state is therefore
recorded as `not used` rather than `VERIFIED`, and the 4-step MCP verification
rule was not exercised because no MCP was required.

`progress/MCP.md` (evidence, 2026-09-14/15) already records the same four
servers and their scopes, and records that GitHub/Cloudflare/TestSprite were
`CONFIGURED — HUMAN ACTION REQUIRED` at that date. That record is **stale** for
this session (Cloudflare and Supabase tools are now exposed; GitHub is not) and
is therefore cited as evidence, not as current state.

---

## 6. GAPS FOUND

| ID | Gap | Severity | Evidence |
|---|---|---|---|
| **G-1** | The canonical pack contained **no Skill Selection Gate at all** — `grep -rni "skill selection"` over the canonical pack = **0 hits** | **HIGH** | §2.A, §2.B |
| **G-2** | Canonical `10_AI_SKILLS.md` is a **15-line stub naming 18 of 32** installed skills, with no matrix, no inventory, no mandatory/optional | **HIGH** | §2.E |
| **G-3** | **14 installed skills are invisible to the canonical registry**, including `gh-cli` and `rust-review`, both directly applicable to T33-P | **HIGH** | §2.E |
| **G-4** | **4 duplicate registries with no precedence rule**; the complete one is in the `HISTORICAL/STALE` root pack and is referenced **0 times** by the canonical pack | **HIGH** | §2.F |
| **G-5** | The canonical pack had **no prohibition on treating a `PROGRESS.md` skill mark as a load**; the only such rule lived in the historical root pack | **HIGH** | §2.H |
| **G-6** | The canonical pack had **no skills-are-not-tools separation statement**; only the historical root pack had it | MEDIUM | §2.C |
| **G-7** | The canonical `10` documented only the `.opencode/skills/` discovery path, **which does not exist here** — an agent auditing it would conclude **zero** skills are available | MEDIUM | §2.D |
| **G-8** | No **re-evaluation on scope change**, no **no-skill-≠-permission** rule, no **record schema**, no **conflict STOP** in the canonical plane | MEDIUM | §2.A |
| **G-9** | `PROGRESS.md:5516` names `f5dca2e4` as the final head; the real head is `e2e2c2c3` | LOW | §1 |
| **G-10** | `apps/desktop/src-tauri/tauri.toml` is a **Tauri configuration file that is untracked** — it exists outside version control. Recorded, not touched | LOW | §1 worktree census |
| **G-11** | `opencode` is not on `PATH`, so the `opencode --version` / `opencode mcp list` commands required by v6 `19` cannot be run → MCP/tool state is `UNKNOWN` by the pack's own rule | LOW | §5 |

**G-7 deserves emphasis.** It is the mechanism by which G-1 survived: an agent
that read the canonical `10`, then listed `.opencode/skills/`, would have found
nothing and reasonably concluded no skill system existed. The registry and the
store were pointing at different places.

---

## 7. EXACT GOVERNANCE CHANGES MADE

**5 canonical files amended in place. 0 pack files created. 0 pack files
deleted. 0 ADRs created, amended, or ratified. `SPEC_MANIFEST.json` (both
copies) not amended. `20_ADR_INDEX.md` (both copies) not touched.**

| # | File | Change | Size |
|---|---|---|---|
| 1 | `docs/Soravo_Engineering_Docs_v6/10_AI_SKILLS.md` | The registry of record. Preserved every existing clause (§3). Added: *This file is the single registry of record*; **Skill Selection Gate** with all 10 required elements; the **domain→skill matrix** covering all 32 verified skills with mandatory/optional + what it governs + `Run with`; **mandatory-domain rules**; *A skill mark is not a loaded skill*; **trust policy**; **re-discovery triggers**; the **record schema**; the **no-skill-≠-permission** rule; the **tools-are-separate** rule; the **authority/source boundary**; the **re-evaluation** rule | 15 → 331 lines |
| 2 | `docs/Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md` | New **Permanent Skill Selection Gate (non-negotiable)** block: mandated sequence, no-skip, no-carry-across-tasks, skills-≠-tools, no-invention, re-run-on-scope-change, record required, mark-≠-load. Step 7 of *Mandatory first sequence* rewritten to run the gate. `## Skill Selection` added to the **Completion report schema**. **SKILL SELECTION FAILURES** added as a named **stop-condition** group | 291 → 348 lines |
| 3 | `docs/Soravo_Engineering_Docs_v6/00_README.md` | Gate sequence restated to include **run the Skill Selection Gate** before task reports and before planning, with the no-plan-before-gate rule | 1 paragraph |
| 4 | `docs/Soravo_Engineering_Docs_v6/18_INTERRUPTION_AND_HANDOFF.md` | *Resume = repeat the gate* now re-runs the **Skill Selection Gate and reloads every mandatory skill**; adds that a skill loaded before the interruption is not loaded for the resumed task | 1 paragraph |
| 5 | `docs/Soravo_Engineering_Docs_v6/11_MCP_AND_AGENT_TOOLING.md` | New **Tool selection is separate from skill selection**: separate obligation, performed after the gate, neither is evidence of the other, select because the task requires the action, cross-reference to `10` | 1 section |

**Root mirror (`Soravo_Engineering_Docs_v6/`) — 5 files, per the project's
canonical/mirror policy:**

- `09_AI_AGENT_INSTRUCTIONS.md`, `10_AI_SKILLS.md`,
  `11_MCP_AND_AGENT_TOOLING.md`, `18_INTERRUPTION_AND_HANDOFF.md` — **byte-identical
  copies** of the canonical versions (verified by `md5sum`, §11).
- `00_README.md` — **pointer only**, no duplicated control text, consistent with
  the mirror's existing T32-Y2 design decision.

**The mirror invariant is preserved:** `diff -rq` reports **only** `00_README.md`
and `20_ADR_INDEX.md` differing (both banner-bearing) plus the 2 disclosed
`22_*` artifacts — exactly as before this task.

**Deliberately NOT changed, and why:**

- `SPEC_MANIFEST.json` (canonical and root) — `file_count: 24` == `files[]` (24)
  == `read_order` (24) == 24 on disk + 2 disclosed extras. Amending it to absorb
  a new file would break the invariant three prior tasks verified.
- `20_ADR_INDEX.md` (canonical and root) — **no ADR trigger fires.** Checked
  against every trigger in the file: architecture change — no; Handy subsystem
  replaced — no; duplicate implementations retained — no; payment/provider
  semantics — no; security boundary — no; auth/storage — no; release
  architecture — no; dependency strategy — no. A process control is not an
  architecture decision (the precedent T32-Y set and T33-I confirmed). ADR-019
  stays accepted on exactly its recorded terms.
- `07_AI_SKILLS.md` (root v2 pack) — **not edited.** It is `HISTORICAL/STALE`
  pending O-5, and repairing O-5 is not this task's mandate. The canonical `10`
  now declares it superseded *for applicability* and names it explicitly, which
  removes the ambiguity without touching a historical document.
- `progress/SKILLS.md` / `progress/MCP.md` — not edited. They are evidence
  records with dates; the canonical registry cites them as evidence.

---

## 8. SKILL-SELECTION PROCEDURE (as now permanent)

```text
READING GATE  (00_README + 09; repeat on every task, resume, or compaction)
      ↓
1. TASK CLASSIFICATION      23 domains, all inspected, multi-domain expected
      ↓
2. SKILL INVENTORY          inspect the LIVE store; compare to the matrix;
                            a named-but-absent skill is UNKNOWN → STOP
      ↓
3. SKILL SELECTION          every domain → mandatory or optional, with what
                            each governs; a skill counts only if it is on disk
      ↓
4. SKILL LOADING            load EVERY mandatory skill BEFORE planning/editing;
                            reload every task; a mark is not a load
      ↓
5. MCP / TOOL SELECTION     separate obligation; select because the action is
                            required, not because the tool exists
      ↓
6. AUTHORITY + CONFLICT     skills = procedure; pack/ADR/upstream docs = authority.
   CHECK                    Conflict with pack, ADR, V1 preservation, source
                            boundary, security baseline, licensing, CI/CD, DoD,
                            or a stop condition → STOP, document, do not choose
      ↓
7. ## Skill Selection RECORD  8 fields, Result: CLEAR | STOP
      ↓
PLAN → IMPLEMENT → TEST → AUDIT → COMMIT / PUSH
      ↑
      └── RE-RUN 1–7 whenever scope changes
```

Every element required by the mandate is present and mapped to a specific
section of the new `10_AI_SKILLS.md`:

| Mandated element | Where it now lives |
|---|---|
| 1. Task classification (23 domains) | `10` §1 + matrix header |
| 2. Skill inventory (name/path, why, mandatory/optional, what it governs) | `10` §2, §3, matrix columns `Mandatory?` / `Governs` / `Run with` |
| 3. Mandatory skill loading before planning/editing | `10` §4 + `09` gate block |
| 4. Tool/MCP selection, separate | `10` §5 + `11` *Tool selection is separate* |
| 5. Source/tool authority boundary | `10` §6 |
| 6. Skill conflict check → STOP | `10` §7 + `09` stop conditions |
| 7. `## Skill Selection` record | `10` §8 + `09` completion-report schema |
| 8. Re-evaluation on scope change | `10` §9 + `09` gate block |
| 9. No skill ≠ permission | `10` §10 + `09` stop conditions |
| 10. Sequence before planning | `09` gate block + `00` restated sequence |

---

## 9. T33-P SKILL APPLICABILITY MATRIX

T33-P is **not started**. Its scope is taken from the repository, not the brief:
`T33-O` §7 and canonical `20_ADR_INDEX.md:29` name it as ADR-019's outstanding
**T2 macOS/Windows build jobs**; `.github/workflows/ci.yml` has 4 jobs, **all
`ubuntu-latest`**, and the `desktop` job runs `pnpm tauri build` as the
already-proven template. `SPEC_MANIFEST.json` declares
`primary_platforms: ["macOS", "Windows"]`.

### 9.1 Domain classification for T33-P

| Domain | Applies? | Basis |
|---|---|---|
| repository / Git operations | **YES** | commit, push, CI read on the PR branch |
| GitHub | **YES** | PR #63 checks, run/job evidence, branch-protection read |
| CI/CD | **YES** | the entire task is a change to `.github/workflows/ci.yml` |
| Rust | **YES** | cross-platform compile verification of a Rust/Tauri crate |
| Tauri | **YES** | the new job executes `pnpm tauri build` |
| testing / QA | **PARTIAL** | build/test QA evidence is the *output*; **no test file is edited** |
| security | **YES** | a new CI job is a security-relevant configuration change; job permissions, no secret exposure, no artifact of unknown provenance |
| documentation / specification / ADR | **YES** | recording the T2 result and ADR-019 obligation status |
| packaging / release | **NO** | compile verification only; packaging, signing, notarization and artifacts are explicitly excluded |
| licensing / provenance | **NO** | no model or dependency change (explicitly excluded) |
| model / catalog / asset handling | **NO** | explicitly excluded |
| speech / audio / STT | **NO** | explicitly excluded |
| benchmarking | **NO** | no measurement |
| database / Supabase, authentication, payments, backend, frontend, React, shadcn/ui, TypeScript | **NO** | out of scope |
| Handy upstream analysis | **PARTIAL** | the gate tests the T33-J byte-restored code, but the task verifies compilation, not provenance |
| MCP / tooling | **PARTIAL** | GitHub state read; no MCP required |
| interruption / handoff / state audit | **YES** | the fresh state audit is the first step |

### 9.2 Skills for T33-P

| Skill | Status | Why it applies | What it governs |
|---|---|---|---|
| `tauri` | **MANDATORY** | the new job runs a Tauri build | Tauri v2 build correctness; capabilities/CSP/security review of anything the job touches |
| `tauri-setup` | **MANDATORY** | the new jobs are *new platform runners*; its description is literally *"prerequisites and environment setup across macOS, Windows, Linux…"* | the exact per-platform prerequisite steps the two new jobs need |
| `rust-engineer` | **MANDATORY** | the gate exists to detect cross-platform compile errors | interpreting and correctly fixing any `E0433`-class or cfg-gated error |
| `gh-cli` | **MANDATORY** | all PR/CI reads, commit, push, run-ID capture | the authenticated GitHub workflow; the recorded run IDs |
| `security-guidance` | **MANDATORY** | a new CI job is a security-relevant configuration change | least privilege on the new job (`permissions: contents: read`), no secret in build output or artifacts, no untrusted input |
| `github` | optional | overlaps `gh-cli`; the registry makes `gh-cli` the default for GitHub work | — declined unless `gh-cli` proves insufficient |
| `rust-review` | conditional | **not** triggered: T33-P adds no Rust code and reviews no existing crate. Load **only** if the task expands into reviewing/hardening Rust | — |
| `supply-chain-risk-auditor` | **NOT selected** | mandatory only on a dependency change; T33-P changes no dependency | — declined: no `Cargo.toml`/lockfile/package change is in scope |
| `vitest` | **NOT selected** | the mandatory trigger is *creating or modifying* tests or a testing acceptance criterion; T33-P edits no test | — declined |
| `playwright` | **NOT selected** | no browser automation in a compile-verification gate | — declined |
| `semgrep` / `codeql` | **NOT selected** | no static-analysis finding is required, and both CLIs are **absent on this host** | — declined |
| `securability-engineering` | **NOT selected** | governs generating/refactoring **code** at trust boundaries; T33-P authors a workflow file, not an endpoint | — declined |
| `agent-security-audit` / `mcp-server-review` | **NOT selected** | no agent, prompt, or MCP configuration is changed | — declined |
| `shadcn`, `react`, `vercel-react-best-practices`, `vercel-composition-patterns`, `frontend-design`, `frontend-accessibility`, `web-design-guidelines` | **NOT selected** | no frontend work | — declined |
| `supabase`, `supabase-postgres-best-practices` | **NOT selected** | no database work | — declined |
| `cloudflare`, `wrangler`, `workers-best-practices`, `web-perf`, `cloudflare-deploy` | **NOT selected** | no Cloudflare work; `pages-deployment.yaml` is a separate workflow and is not touched | — declined |
| `secure-workflow-guide` | **NOT selected** | smart-contract workflow; not applicable to Soravo (the registry records this) | — declined |
| `find-skills` | **NOT selected** | every applicable domain is already covered by an installed skill; no uncovered domain arises | — declined: no discovery need |

**Mandatory for T33-P: 5** — `tauri`, `tauri-setup`, `rust-engineer`, `gh-cli`,
`security-guidance`. Every one was verified present in the live store and its
`SKILL.md` description read first-hand.

### 9.3 MCP / tools for T33-P

| Tool | Status | Basis |
|---|---|---|
| repository / file tooling | **SELECTED** | reading `ci.yml`, `release.yml`, `Cargo.toml`, `tauri.conf.json`; writing the workflow diff |
| `gh` CLI | **SELECTED** | `gh pr view`, `gh pr checks`, `gh run view`, `gh run list`, `gh api` — all read-only, plus `git` commit/push |
| `github` MCP | **NOT selected** | configured `enabled: true` but **no GitHub MCP tool is exposed in this session** → `UNKNOWN` under v6 `11`; `gh` is the correct fallback |
| `supabase` MCP | **NOT selected** | tools are exposed, but a compile gate requires no database operation |
| `cloudflare` MCP | **NOT selected** | tools are exposed, but no Cloudflare operation is in scope |
| `testsprite` MCP | **NOT selected** | not exposed (no key); v6 `11` records TestSprite as supplemental to deterministic tests, never a build gate |

### 9.4 A conflict T33-P must resolve before it starts — recorded, not resolved here

**This task's own brief lists `.github/workflows` under PROTECTED PATHS "unless
the governance audit itself proves a documentation change is necessary".**
T33-P's mandate from `T33-O` §7 and ADR-019 **is** to add jobs to
`.github/workflows/ci.yml`. The protected-path rule is scoped to **this
governance task**, and this task touched no workflow — verified in §10. The
tension is recorded so T33-P's gate does not trip on a rule written for a
different task.

**A second, independent conflict T33-P must record:** `release.yml` already
contains a `macos-latest` ×2 / `windows-latest` ×1 build matrix, but it is
`on: workflow_dispatch` only and **has never run** (`gh run list
--workflow=release.yml` → empty). T33-P must not dispatch it, must not treat it
as macOS/Windows evidence, and must not enable signing — the signing secrets in
`release.yml:88-97` are commented out and unconfigured, and v6 `15` requires
human escalation for signing keys.

### 9.5 T33-P conclusion

T33-P is **fully agent-executable with no external input** once its gate is run,
and it needs **no ADR and no owner decision**: ADR-019 is already accepted and
already records T2 as an outstanding obligation. That determination is T33-O's
and is re-derived here only as far as the ADR index and `ci.yml` confirm it.
**T33-P is NOT started.**

---

## 10. CONFLICT / AUTHORITY ANALYSIS

Every one of the nine authority surfaces named in the mandate was checked
against the changes this task made:

| Authority surface | Conflict? | Basis |
|---|---|---|
| **v6 authority** | **NO** | The change is additive to the pack, is inside the pack, and is self-governing under `00`'s authority ladder. It does not restate, override, or weaken any existing clause; §3 lists every preserved clause. |
| **ADRs** | **NO** | No ADR trigger in `20_ADR_INDEX.md` fires. ADR-019 stays accepted on exactly its recorded terms; ADR-011 (model licensing), ADR-009 (no duplicate stacks), ADR-015 (TestSprite supplemental) untouched. `20_ADR_INDEX.md` **not edited**. |
| **V1 Handy preservation** (`02`, `04`, `09`, `21`) | **NO** | No source classification changed, no Handy file touched, no behaviour altered. The change set is 10 Markdown files. |
| **Source boundary** (`09`) | **NO** | No desktop subsystem was touched; the boundary rule is unexercised. |
| **Security baseline** (`12`) | **NO** | Nothing weakened. The gate *adds* two constraints (reload per task; a mark is not a load) and adds a stop-condition group. |
| **Licensing / provenance** (`08` T10, `21`, ADR-011) | **NO** | No model metadata, licence, hash, mirror, or attribution is asserted. `insecure-defaults` remains correctly not installed and is not named. |
| **CI/CD policy** (`14`) | **NO** | `14` classifies failure modes A–F and requires exact run IDs. The gate's record and `UNKNOWN` discipline reinforce this. No workflow was touched. |
| **Definition of done** (`13`) | **NO** | The gate adds a report field; it does not relax any DoD item. |
| **Stop conditions** (`09`) | **NO — extended** | Seven `SKILL SELECTION FAILURES` were **added** to the existing list. The four pack conditions absent from the mandate's list (database history diverges; security would have to be weakened; dependency change crosses subsystem boundaries; wider migration) were **kept**, not replaced. Hardening is additive. |

**STOP conditions from the mandate: none triggered.** Each assessed explicitly:

| Mandated STOP condition | Assessment |
|---|---|
| the skill registry cannot be located | **NOT TRIGGERED** — located: canonical `docs/Soravo_Engineering_Docs_v6/10_AI_SKILLS.md`, cross-checked against the live store and 3 other locations |
| skill definitions conflict with v6 authority | **NOT TRIGGERED** — no skill instruction conflicts with the pack; the pack already states skills are not authority, and the new registry restates it |
| a referenced skill does not exist | **NOT TRIGGERED** — 0 dangling references before the change; **0 invented names** after it, verified by set-comparing every cited token against the live store (§11) |
| canonical and mirror skill documents disagree materially | **NOT TRIGGERED** — the two `10_AI_SKILLS.md` copies were byte-identical before; they remain byte-identical after (`md5 d0b70ce1…`) |
| MCP/tool ownership is ambiguous | **NOT TRIGGERED** — ownership is recorded in `11` and in this report §5; `UNKNOWN` is used where a server is configured but unexposed |
| adding the gate would require inventing a skill | **NOT TRIGGERED** — every name in the new matrix is one of the 32 verified installed skills; two absent domains are recorded as *absent*, per the pre-existing discipline |
| the existing governance cannot safely be modified without an ADR | **NOT TRIGGERED** — no ADR trigger fires; the T32-Y/T33-I precedent (a process control is not an architecture decision) applies directly |
| a protected path would need modification | **NOT TRIGGERED** — 0 protected paths modified (§10) |
| the repository's authority chain is unresolved | **NOT TRIGGERED** for this task's scope — canonical pack, mirror, and index of record were all determined from three independent bases in v6 `00`. **Item O-5 (the root v2 pack's authority) remains open and is recorded, not resolved** |

**One STOP-adjacent item is recorded rather than resolved: O-5.** The root v2
pack is `HISTORICAL/STALE` pending owner reconciliation, and `PROGRESS.md`,
`README.md`, and `SORAVO_PLAN.md` still name `docs/spec-v3/` as authoritative
(T33-O §6 measured **30 broken references**). This task did **not** touch it:
repairing O-5 is a separate owner-gated item, and v6 `09` forbids an agent
asserting a resolution to an owner-gated item.

---

## 11. VERIFICATION THAT NO PROTECTED SOURCE FILE CHANGED

Verified by `git status` and by path-filtered `git status`, not asserted:

| Protected path class | Result |
|---|---|
| Rust source — `crates/**`, `apps/desktop/src-tauri/**` | **UNCHANGED** |
| TypeScript/JavaScript source — `apps/desktop/src/**`, `services/**`, `packages/**` | **UNCHANGED** |
| Tests — all `*.test.*`, `*.spec.*`, `tests/**` | **UNCHANGED — 0 touched** |
| `catalog.json` | **UNCHANGED** |
| Model files / ONNX / assets | **UNCHANGED** — 0 present in the repository; none added |
| `package.json` | **UNCHANGED** |
| `pnpm-lock.yaml` | **UNCHANGED** |
| `Cargo.lock` / `Cargo.toml` | **UNCHANGED** |
| `.github/workflows/**` | **UNCHANGED** — 4 files, none modified |
| Release configuration | **UNCHANGED** — `release.yml` read only |
| Tauri configuration | **UNCHANGED** — `tauri.conf.json` untouched; the untracked `apps/desktop/src-tauri/tauri.toml` (G-10) was read only, never written |
| GitHub settings | **UNCHANGED** — branch protection read via a read-only `GET`; no rule, secret, or review mutated |

**The complete change set is 10 Markdown files, all under the two v6 pack
trees.** `git status --porcelain | grep -v '^??'` returns exactly those 10
paths. The 36 pre-existing untracked paths were preserved untouched — none
staged, none reset, none cleaned, none modified.

**Documentation-consistency checks run this session — all PASS:**

| Check | Result |
|---|---|
| `file_count: 24` == `files[]` (24) == `read_order` (24) | **PASS** — 24/24/24/24 |
| 26 files on disk == 24 manifest + 2 disclosed `22_*` artifacts | **PASS** |
| `SPEC_MANIFEST.json` unmodified (both copies) | **PASS** |
| canonical/mirror divergence == only `00` + `20` + 2 disclosed artifacts | **PASS** |
| `md5sum` canonical vs mirror for `09`, `10`, `11`, `18` | **identical** (4/4) |
| every skill token cited in the new `10` is a real installed skill | **PASS — 0 invented** |
| every one of the 32 installed skills is cited in the new `10` | **PASS — 32/32** |
| dangling skill references | **0** |
| protected-path filter over tracked modifications | **empty** |
| test-file filter over tracked modifications | **empty** |
| `git diff --check` | **exit 0** |

**Additive-only proof.** The staged change set adds a `SKILL SELECTION GATE`
block, a verbatim-retention block for the four original clauses, a
registry-of-record section, a discovery-path paragraph, a matrix, a record
schema, a trust policy, a re-discovery section, a gate-sequence block, a report
schema line, a stop-condition group, and three paragraphs — and rewrites exactly
one numbered list item (step 7 of *Mandatory first sequence*) to invoke the
gate. **No existing rule was deleted or relaxed.** Where the mandate's
stop-condition list overlapped the pack's, the union was kept, so a stop
condition present in the pack but absent from the mandate survives.

### G-12 — a preservation failure this task caused, and caught before commit

**Disclosed, not hidden.** The first write of the new `10_AI_SKILLS.md`
**restated the substance of the four original clauses but lost their exact
wording.** Five phrases were verified LOST by literal `grep -F` before any
commit: *"identify the narrowest relevant skill"*, *"inspect/load its current
content"*, *"follow it unless it conflicts with this pack"*, *"use current
official API docs for fast-changing systems"*, and *"Do not install every skill
blindly. Review permissions and network/shell access."* A reworded substitute is
not preservation, and the mandate required the existing terminology to be kept.

**Detected by** enumerating every `-` line of the staged diff and asserting each
removed clause still existed in the new file — the same post-edit superset
check whose absence produced T32-Y2's G-5. **Fixed before commit** by adding a
verbatim-retention block that quotes all four clauses plus the
do-not-install-blindly rule word for word, and stating explicitly that the
sections below them are their *enforced expansion* that adds obligations and
relaxes none. All **8** original clauses now verify PRESENT under a
wrap-insensitive literal match, and the four mirrored pairs are byte-identical
(`md5 2ba389c0…`).

**Why this is recorded:** it is a **net control weakening introduced and removed
inside one task** — precisely the failure class the reading gate, the source
boundary, and the "never skip from a report to implementation" rule exist to
prevent. It was caught only because the removal list was enumerated rather than
skimmed. A future agent tightening this pack must do the same.

---

## 12. GIT DIFF / CHECK RESULTS

```text
$ git status --porcelain | grep -v '^??'
 M PROGRESS.md
 M Soravo_Engineering_Docs_v6/00_README.md
 M Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md
 M Soravo_Engineering_Docs_v6/10_AI_SKILLS.md
 M Soravo_Engineering_Docs_v6/11_MCP_AND_AGENT_TOOLING.md
 M Soravo_Engineering_Docs_v6/18_INTERRUPTION_AND_HANDOFF.md
 M docs/Soravo_Engineering_Docs_v6/00_README.md
 M docs/Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md
 M docs/Soravo_Engineering_Docs_v6/10_AI_SKILLS.md
 M docs/Soravo_Engineering_Docs_v6/11_MCP_AND_AGENT_TOOLING.md
 M docs/Soravo_Engineering_Docs_v6/18_INTERRUPTION_AND_HANDOFF.md
?? T33-PRE-SKILL-SELECTION-GATE-AUDIT.md      <- this task's new report

$ git diff --check ; git diff --cached --check
exit=0 / exit=0

$ git diff --cached --name-only | grep -v '\.md$'
(empty — 0 non-Markdown files)

$ git diff --cached --name-only | grep -E 'crates/|apps/|services/|packages/|supabase/|\.github/|Cargo\.|pnpm-lock|package\.json|catalog\.json|\.test\.|\.spec\.'
(empty — 0 protected paths)

$ git status --porcelain | grep -c '^??'
37    # 36 pre-existing, preserved; + this task's new report
```

**Final commit** `eb4771547cbbd44a26add7d2a078859c143e024e` — 12 files,
**2184 insertions / 31 deletions**, **all Markdown**. The 31 deletions were each
individually accounted for: every removed clause is either a line re-wrap, the
`step 7` rewrite that preserves *"narrowest applicable skill"*, the V1
stop-condition heading that was re-inserted below the new group, or content
restated in a strictly stronger form (the 18-name "known families" line is now a
32-row matrix — all 18 verified present in it).

**Push** `e2e2c2c3..eb477154` → `origin/t31/soravo-wrapper-completion`; **0 ahead
/ 0 behind** afterwards.

---

## 13. SECURITY

- **Provider mutations: ZERO.** All GitHub access was read-only: `git fetch
  --prune`, `gh pr view`, `gh pr checks`, `gh run list`, `gh api
  …/branches/main/protection`. No review, no merge, no retitle, no
  branch-protection change, no release.
- **No secret** read, printed, or committed. Secret state was not inspected
  because it was not needed. `~/.config/opencode/opencode.jsonc` was read for
  its `skills.paths` and `mcp` blocks only; its `{env:…}` interpolation was not
  resolved and no value was read.
- **No `unsafe`, no security boundary moved.** CSP, `capabilities/default.json`,
  RLS, webhook HMAC and `verify_jwt` untouched. No advisory suppressed,
  allowlisted, or downgraded; the 13-entry `cargo audit` ignore list in CI is
  pre-existing and unmodified.
- **No licence cleared, no attribution fabricated.** `compatible` remains ×0
  across the 69 catalogue models.
- **MCP not used.** Zero MCP tool calls; MCP state recorded as `not used`, not
  `VERIFIED`.
- **Only Markdown written.** No production source, test, config, dependency,
  lockfile, workflow, catalogue, model asset, or release configuration.

---

## 14. COMPLETION REPORT

| Field | Value |
|---|---|
| **TASK ID** | T33-PRE — SKILL SELECTION GOVERNANCE GATE |
| **Objective** | Establish and enforce a permanent Skill Selection Gate for all future OpenCode work on Soravo; audit whether one existed; do not start T33-P |
| **Branch** | `t31/soravo-wrapper-completion` |
| **Start SHA** | `e2e2c2c323de49db08db84a57df5b4968d8b68fe` |
| **End SHA** | **`eb4771547cbbd44a26add7d2a078859c143e024e`** |
| **Changed files** | 10 Markdown files: canonical `docs/Soravo_Engineering_Docs_v6/{00,09,10,11,18}` + root mirror `Soravo_Engineering_Docs_v6/{00,09,10,11,18}`; plus this report and `PROGRESS.md` |
| **Deliberately unchanged** | All production source; every test; `catalog.json`; model assets; `package.json`; `pnpm-lock.yaml`; `Cargo.toml`; `Cargo.lock`; `.github/workflows/**`; release config; Tauri config; `SPEC_MANIFEST.json` (both); `20_ADR_INDEX.md` (both); the 2 disclosed `22_*` artifacts; all 36 pre-existing untracked paths; every historical `PROGRESS.md` entry |
| **Commands** | `git fetch/status/log/worktree/diff --check` · `ls ~/.agents/skills` · `grep`/`comm` set comparison of the registry against the live store · `md5sum` canonical vs mirror · `diff -rq` mirror census · `gh pr view/check` · `gh run list` · `gh api …/branches/main/protection` · `rustup target list --installed` |
| **Exact results** | see §11; all consistency checks PASS, `git diff --check` exit 0 |
| **Tests** | **None run.** The change set contains **zero source and zero test files**, so no test target is affected. The `256 passed / 0 failed` baseline is **carried, not re-measured**, and is `HISTORICAL/STALE` as a current claim. **CI is the authority and is reported from GitHub runs.** |
| **Security** | see §13 |
| **CI** | pre-change at `e2e2c2c3`: `36677713859` success, `36677713913` success. **Post-push at `eb477154`: `36680702309` CI `completed`/`success`** (`web` 1m0s · `e2e` 1m14s · `rust` 8m0s · `desktop` 10m57s) **and `36680702406` Security Audit `completed`/`success`** (`npm-audit` 22s · `cargo-deny` 38s · `cargo-audit` 9s). All 7 PR checks **pass** |
| **Deployment** | none — not requested, not performed |
| **External configuration** | none changed |
| **Blockers** | PR #63 needs 1 human approval. **O-5** (root v2 pack authority, 30 broken `docs/spec-v3/` references) remains open — recorded, not repaired |
| **ADR/docs updated** | this report + `PROGRESS.md` + the 10 governance files. **No ADR required and none created**; `20_ADR_INDEX.md` not touched |
| **Commit** | **`eb4771547cbbd44a26add7d2a078859c143e024e`** — 12 files, all Markdown, 0 non-Markdown, 2184 insertions / 31 deletions |
| **Push** | `e2e2c2c3..eb477154` → `origin/t31/soravo-wrapper-completion`; 0 ahead / 0 behind afterwards |
| **CI (observed)** | **`36680702309`** CI `completed`/`success` (`web` 1m0s · `e2e` 1m14s · `rust` 8m0s · `desktop` 10m57s) · **`36680702406`** Security Audit `completed`/`success` (`npm-audit` 22s · `cargo-deny` 38s · `cargo-audit` 9s) — all 7 PR checks **pass** |
| **PR** | #63 — remains **OPEN and UNMERGED**, not retitled |
| **Stop conditions** | **None triggered** — see §10, assessed one by one |
| **Next exact task** | **T33-P — T2 macOS/Windows build verification gate (ADR-019). NOT started.** Its mandatory skills are `tauri`, `tauri-setup`, `rust-engineer`, `gh-cli`, `security-guidance` (§9.2); its tools are repository/file tooling and the `gh` CLI (§9.3); and the two pre-recorded conditions in §9.4 must be carried into its own gate. |

---

## 15. `## Skill Selection` — this task's own record

```markdown
## Skill Selection

- Task classification:  documentation/specification/ADR (PRIMARY);
  repository/Git operations (commit, push, CI read); CI/CD (T33-P analysis,
  workflow inspection); security (protected-path + secret-hygiene verification).
  Inspected and NOT applicable: Rust, Tauri, TypeScript/JavaScript, React,
  shadcn/ui, frontend, backend, database/Supabase, authentication, payments,
  benchmarking, packaging/release, licensing/provenance, Handy upstream
  analysis, speech/audio/STT, model/catalog/asset handling.
- Mandatory skills selected:
  gh-cli      — governs every GitHub operation in this task: `gh pr view`,
                `gh pr checks`, `gh run list`, `gh api` (read-only) plus the
                commit and push. LOADED.
  security-guidance — mandatory by domain (secrets; a CI/deployment-adjacent
                configuration assertion). LOADED: Core Principle, the 4-step
                Workflow, the Escalation rule, and index entries V13.1
                (Configuration Documentation), V13.3 (Secret Management),
                V13.4 (Unintended Information Leakage) read from the file.
- Optional skills considered:
  github      — declined; overlaps gh-cli, which the registry makes the default
                for GitHub work.
  tauri       — considered for the T33-P applicability analysis (§9.2); its
                SKILL.md description was read to ground the matrix. NOT loaded
                as governing for this task, because this task changes no Tauri
                code and makes no Tauri claim.
  rust-review — declined; no Rust is authored, reviewed, or hardened here.
  supply-chain-risk-auditor — declined; no dependency is added, removed,
                upgraded, or pinned.
- MCP/tools selected:
  repository/file tooling — reading SPEC_MANIFEST, the v6 pack, PROGRESS.md,
                ci.yml, release.yml, the opencode config, and the live skill
                store; writing 10 Markdown files.
  `gh` CLI (via gh-cli) — all GitHub reads, read-only.
- Skills deliberately not selected:
  react, vercel-react-best-practices, vercel-composition-patterns, shadcn,
  frontend-design, frontend-accessibility, web-design-guidelines — no frontend.
  supabase, supabase-postgres-best-practices — no database.
  cloudflare, wrangler, workers-best-practices, web-perf, cloudflare-deploy —
  no Cloudflare work.
  semgrep, codeql — no static-analysis finding required, and both CLIs are
  absent on this host.
  securability-engineering, agent-security-audit, mcp-server-review — no code,
  agent, prompt, or MCP configuration is changed.
  vitest, playwright — no test is created or modified; no browser is driven.
  secure-workflow-guide — smart-contract workflow; not applicable to Soravo.
  find-skills — every applicable domain is already covered; no uncovered
  domain arises, so discovery is not needed.
  Audio/STT and benchmarking: NO SKILL EXISTS. Recorded as an absent
  capability per the existing discipline; no mapping invented.
- Authority/source boundary:
  Governance and precedence — docs/Soravo_Engineering_Docs_v6/ (canonical,
  index of record, per 00_README "Duplicate pack copies"); root v2 pack
  HISTORICAL/STALE (O-5 open), read for traceability only, never allowed to
  override. Skill inventory — the live filesystem store ~/.agents/skills
  (32 dirs) plus the session's own skill listing; NOT any report, NOT
  PROGRESS.md, NOT chat history, NOT memory. Skill descriptions — each named
  skill's own SKILL.md frontmatter, read first-hand. CI/PR state — the GitHub
  API, never PROGRESS.md. Design authority — DESIGN.md. Handy provenance —
  upstream identity per 21; no claim made here.
- Conflicts found:
  1. RESOLVED BY DESIGN — two duplicate skill registries with no precedence
     rule and a coverage inversion (canonical 18 names vs a complete 361-line
     matrix in the HISTORICAL/STALE root pack, referenced 0 times by the
     canonical pack). Resolution: strengthen the canonical file in place and
     have it declare itself the single registry of record and name the others
     as evidence. No third registry created; no historical file edited.
  2. RESOLVED — the canonical 10 documented only `.opencode/skills/`, which
     does not exist here, so an agent auditing that path would have found zero
     skills. Resolution: the registry now documents the host-global
     `skills.paths` store alongside the project-local path.
  3. RESOLVED — the "a mark is not a load" rule existed only in the
     HISTORICAL/STALE root pack. Resolution: stated in the canonical registry
     and in the canonical agent-operating file.
  4. RECORDED, NOT RESOLVED — the canonical pack had no skills-are-not-tools
     separation statement. Resolution: added to canonical 10 §5 and to
     canonical 11.
  5. RECORDED FOR T33-P — this task's own brief lists .github/workflows under
     PROTECTED PATHS, while T33-P's mandate from T33-O §7 and ADR-019 requires
     adding jobs to ci.yml. The protected-path rule is scoped to THIS
     governance task, which touched no workflow. Carried into T33-P's gate.
  6. RECORDED FOR T33-P — release.yml already holds a macOS/Windows build
     matrix but is workflow_dispatch-only and has never run; it is not
     macOS/Windows evidence and must not be dispatched or signed by T33-P.
  7. RECORDED, NOT RESOLVED — O-5 (root v2 pack authority; 30 broken
     docs/spec-v3/ references) is owner-gated. Not repaired, not asserted.
- Result: CLEAR
```

---

**STOP. T33-PRE is complete. T33-P is NOT started. PR #63 is NOT merged.**
