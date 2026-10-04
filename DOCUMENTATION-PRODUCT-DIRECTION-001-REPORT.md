# DOCUMENTATION-PRODUCT-DIRECTION-001-REPORT

TASK: DOCUMENTATION-PRODUCT-DIRECTION-001
Date (UTC): 2026-09-28
Scope: documentation-only. No commit. No push.

## 0. Skill-selection gate (completed before any edit)

Per `docs/Soravo_Engineering_Docs_v6/10_AI_SKILLS.md`: skills are procedural
guidance, never repository authority; use the narrowest relevant skill; the
installed list must be re-audited locally. Local audit result: no
project-local skills exist (`.opencode/skills/` absent); global skill source
(`~/.agents/skills/`) contains exactly the families named in `10_AI_SKILLS.md`.

Skills loaded and why:

- `supabase` — Soravo accounts (Auth/PKCE/session), Soravo cloud
  (Postgres/RLS, Edge Functions `payment-checkout` / `razorpay-webhook`),
  entitlement storage. Directly informs §06 wording.
- `supabase-postgres-best-practices` — entitlement semantics are database
  constraints authoritative; RLS/service-role boundary. Informs §06 and the
  planned-vs-implemented treatment.
- `security-guidance` — server-authoritative price/user/product/entitlement,
  secret boundary (no provider secrets in browser/desktop), frontend-untrusted.
  Informs §06 provider-boundary wording, consistent with `12_SECURITY_BASELINE.md`.
- `tauri-development` — Tauri v2 + React/TS + Rust desktop structure, typed IPC,
  least-privilege capabilities. Informs §03/§04 Handy-derived foundation
  classification and the integration-contract wording.

Considered but deliberately NOT loaded (narrowest-skill rule; doc-only scope):

- `rust-engineer`, `react`, `shadcn`, `web-design-guidelines`,
  `frontend-accessibility` — implementation/UI skills; this task writes no code
  and changes no UI. Loading them would widen scope without informing wording.
- `cloudflare`, `cloudflare-deploy`, `wrangler`, `workers-best-practices` —
  hosting (Cloudflare Pages per ADR-014) is restated unchanged, not redesigned.
- `github`, `vitest`, `securability-engineering`, `agent-security-audit`,
  `tauri`, `tauri-setup` — no provenance re-verification, test, or setup work
  is in scope; chain-of-custody (§21) is referenced, not re-executed.
- No skill exists in the catalog for product-requirements authoring or ADR
  authoring, so those two gate categories are satisfied directly by the
  authoritative pack itself (which outranks skills).

No skill content overrode pack authority. Where skill guidance and the pack
could diverge (e.g. generic Supabase patterns vs. this repo's fixed
checkout/webhook contracts), the pack governs.

## 1. Files inspected

Authoritative pack (`docs/Soravo_Engineering_Docs_v6/`, read in task order):

1. `00_README.md`
2. `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md`
3. `02_PRODUCT_REQUIREMENTS.md`
4. `03_TECHNICAL_DESIGN.md`
5. `04_HANDY_FORK_AND_REUSE_POLICY.md`
6. `05_DESKTOP_CONTRACTS.md`
7. `06_WEB_CLOUD_PAYMENT.md`
8. `07_IMPLEMENTATION_PLAN.md`
9. `08_TASK_BREAKDOWN.md`
10. `09_AI_AGENT_INSTRUCTIONS.md`
11. `10_AI_SKILLS.md`
12. `11_MCP_AND_AGENT_TOOLING.md`
13. `12_SECURITY_BASELINE.md`
14. `13_DEFINITION_OF_DONE_AND_QA.md`
15. `14_CI_CD_AND_BRANCHING.md`
16. `15_ENVIRONMENT_AND_SECRETS.md`
17. `16_TEST_AND_BENCHMARK_PROTOCOL.md`
18. `17_RELEASE_RUNBOOK.md`
19. `18_INTERRUPTION_AND_HANDOFF.md`
20. `19_STATE_AUDIT_PROTOCOL.md`
21. `20_ADR_INDEX.md`
22. `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`
23. `DESIGN.md` (read; NOT modified — authoritative design spec)
24. `SPEC_MANIFEST.json` (read; NOT modified)

Historical documents were NOT treated as authoritative (per `00_README.md`
authority ladder and the task instruction). Note: an untracked directory
`Soravo_Engineering_Docs_v6/` exists at repo root (untracked, `??` in git
status); the git-tracked authoritative pack is `docs/Soravo_Engineering_Docs_v6/`.
All edits were applied to the tracked path only.

## 2. Current product-direction wording (before this task)

- `00_README.md` §Scope: "Soravo is a local-first FOSS desktop dictation
  product. The desktop foundation is Handy-derived, but Soravo owns
  requirements, contracts, security, privacy, branding, payments, account,
  entitlement, model policy, benchmark policy, and release policy." Plus:
  "The current recovery priority is desktop build stabilization before
  additional feature expansion."
- `02_PRODUCT_REQUIREMENTS.md`: local-first FOSS desktop dictation; not cloud
  STT / meeting intelligence / RAG / collaboration / mobile / general AI
  assistant. V1 stack Tauri v2 + React/TypeScript + Rust + shadcn/ui/Tailwind.
  Full visual redesign deferred.
- `04_HANDY_FORK_AND_REUSE_POLICY.md` §Product decision: "Soravo uses Handy as
  a desktop implementation foundation and derives/adapts it into a
  Soravo-owned product. Handy is not a requirements authority."
- `07_IMPLEMENTATION_PLAN.md` phase order: 0 Control plane → 1 CI baseline →
  2 Handy foundation recovery → 3 Functional desktop integration → 4 Model
  provenance/benchmark → 5 Payment → 6 Security/QA → 7 Release → 8 Visual
  redesign (`DESIGN.md` authoritative).
- `20_ADR_INDEX.md`: ADR-006 Handy-derived desktop foundation; ADR-004
  Razorpay; ADR-010 UI overhaul deferred; ADR-014 Cloudflare Pages.

Gap: no single deterministic sentence defined Soravo as a Soravo-branded fork
of Handy with the enumerated Soravo-owned additions; no ordered 9-step product
objective; no explicit extend-over-rewrite principle with documented-exception
clause; no agent-decidable fork/reuse boundary rule; no Razorpay-as-provider-detail
statement.

## 3. Existing Handy fork/reuse requirements (unchanged, still in force)

- `04`: per-subsystem procedure (locate Soravo impl → locate Handy equivalent →
  inspect source → provenance → classify → reuse/adapt → smallest delta → tests
  → document → update chain-of-custody). ADOPT/ADAPT list (Tauri shell, React
  foundation, audio toolkit, VAD, hotkeys, typing/input, clipboard, settings,
  tray, overlay, model management, transcription infra, history, platform
  plumbing). SORAVO-OWNED list (session machine, transcript semantics, typed
  IPC, auth, Supabase, entitlements, payment, model licensing/provenance,
  product decisions, branding, release policy). REPLACE = user-facing Handy
  branding/identity or contract-conflicting behavior. No duplicate stacks; no
  automatic upstream sync (pinned SHAs + diff + license + regression + PR/ADR).
- `21`: exact upstream Handy repo+commit currently `UNKNOWN` (pin `842acdf9`
  proven NOT an ancestor of current `main`; PR #55 closed unmerged; commit
  `a156c8c9` integrated 40+ Handy-derived files). Source-manifest fields and
  reuse classifications (`HANDY-REUSE` / `HANDY-ADAPT` / `SORAVO-NEW` /
  `HANDY-REPLACE` / `SORAVO-OWNED`).
- `09`: inspect Handy-derived equivalent before creating desktop abstractions;
  search-before-abstraction; stop when two implementations would coexist.

## 4. Existing account/cloud/payment requirements (unchanged, still in force)

- `02`: website (landing/features/pricing/download/FAQ/support/legal/login/
  account/admin); Supabase Auth/Postgres/RLS; Razorpay server-controlled
  payments; customer entitlement/device/session dashboard; owner-only admin; no
  audio/transcript/keystroke/clipboard telemetry.
- `03`: Website → Supabase Auth/JWT → `payment-checkout` → Razorpay; Razorpay →
  `razorpay-webhook` → ledger → Supabase entitlements → account/desktop.
  Catalog source of truth `packages/payment-domain`. Lifetime = Razorpay Order;
  Monthly = Razorpay Plan + Subscription. Browser receives only public key ID +
  provider transaction identifiers.
- `06`: checkout/webhook endpoints, PKCE auth, client RLS (no client
  entitlement writes; service role server-only), HMAC + durable
  `webhook_events` ledger, lifetime/monthly entitlement semantics with DB
  constraints authoritative, no third price catalog.
- `12`/`15`: provider secrets server-only; frontend untrusted.

## 5. Exact contradictions or gaps found

1. GAP (fixed): no deterministic "Soravo-branded fork" strategy sentence —
   fixed in `02` (§Product direction).
2. GAP (fixed): extend-over-rewrite principle existed only implicitly (`04` No
   duplicate stacks + `09` search-before-abstraction) without the documented
   technical/legal/security/compatibility/product exception clause — fixed in
   `04` (§Deterministic product-direction rules).
3. GAP (fixed): no agent-decidable fork/reuse boundary + integration-contract
   decision rule — fixed in `04` with cross-links to `03`/`05`/`21`.
4. GAP (fixed): Razorpay-as-provider-detail / provider-independent domain never
   stated — fixed in `06` (+ placement rule in `03`).
5. GAP (fixed): no ordered 9-step primary product objective; no V1
   Windows/macOS non-blocking interpretation — fixed in `02`.
6. GAP (fixed): no planned-vs-implemented status rule for product capabilities —
   fixed in `02` (PLANNED until `01` evidence vocabulary satisfied).
7. RECORDED, NOT CHANGED (out of scope / unrelated section): `00_README.md`
   line 1 title reads "Soravo Engineering Documentation Pack v5" while
   `SPEC_MANIFEST.json` declares `"version": "6.0.0"`. Left untouched per
   editing rules 5–7 (smallest scope; do not rewrite unrelated sections; do
   not silently resolve). Flagged here explicitly for a future docs-hygiene
   pass.
8. TENSION RESOLVED BY SCOPING (not a contradiction after scoping): task
   priority item 3 "Apply Soravo branding/design" vs deferred full redesign
   (`02` line 21, `07` Phase 8, ADR-010). Resolution recorded in the new `02`
   text: item 3 = product-identity rebrand (T09 — remove user-facing Handy
   branding where Soravo branding is required); the full `DESIGN.md` visual
   redesign stays Phase 8. Both statements now coexist explicitly.
9. No other contradictions found between the new wording and `01` (evidence
   vocabulary), `07` (execution order explicitly preserved), `08` (T05 Linux
   isolation, T09 rebrand), `12`, `14`, `17`, or `20` (no ADR created: no
   system boundary, payment semantics, auth/storage, or release-architecture
   change was made — documentation made existing intent explicit).

## 6. Files changed

Exactly 4 tracked files, all under `docs/Soravo_Engineering_Docs_v6/`:

- `02_PRODUCT_REQUIREMENTS.md` (+26 lines)
- `03_TECHNICAL_DESIGN.md` (+4 lines)
- `04_HANDY_FORK_AND_REUSE_POLICY.md` (+14 lines)
- `06_WEB_CLOUD_PAYMENT.md` (+4 lines)

Total: 48 insertions, 0 deletions (purely additive; no existing sentence
rewritten or removed).

## 7. Exact sections changed

- `02_PRODUCT_REQUIREMENTS.md`: appended three sections after the existing
  closing line ("The full Soravo visual redesign is deferred…"):
  `## Product direction (deterministic)`, `## Primary product objective
  (priority order)`, `## Platform priority (V1)`.
- `03_TECHNICAL_DESIGN.md`: appended `## Fork/reuse boundary (integration
  view)` after the payment-catalog paragraph.
- `04_HANDY_FORK_AND_REUSE_POLICY.md`: appended `## Deterministic
  product-direction rules` (3 rules) and `## Fork/reuse boundary and decision
  rule` after `## Release gate`.
- `06_WEB_CLOUD_PAYMENT.md`: appended `## Soravo ownership and provider
  boundary` after "No third price catalog may exist."

Untouched by design: `00`, `01`, `05`, `07`–`21` (except `04`/`06` above),
`DESIGN.md`, `SPEC_MANIFEST.json` (file_count still 24; no files added or
removed from the pack).

## 8. New deterministic product-direction rules

1. "Soravo is a Soravo-branded fork of Handy, retaining the appropriate
   Handy-derived local desktop/dictation foundation while adding Soravo-owned
   accounts, cloud services, entitlements, subscriptions, payments, and product
   infrastructure." (`02`)
2. Retention is conditional — subject to license, provenance, compatibility,
   security, and product review; no automatic retention of every Handy feature.
   (`02`, enforcing doc §A)
3. "Prefer extending and integrating the Handy-derived foundation over
   rewriting equivalent local functionality from scratch, unless a documented
   technical, legal, security, compatibility, or product requirement requires
   replacement." (`04`, doc §C)
4. "The fork must not become a ground-up rewrite of Handy… Do not duplicate an
   existing Handy subsystem merely to make it 'Soravo native.'" (`04`, doc §G)
5. Priority order 1–9 exactly as tasked (foundation → buildable/testable →
   branding/identity → accounts → cloud → entitlements/subscriptions →
   payments → sync → reproducible builds/provenance/security/CI/release),
   stated as product priority with execution order and gates still governed by
   `07`/`08`. (`02`, doc §E)
6. Accounts, cloud, entitlements, subscriptions, payments are Soravo-owned
   systems; provider logic stays out of the Handy-derived local core; explicit
   contracts/interfaces between desktop client and Soravo services. (`03`,
   `04`, `06`; doc §H)
7. Razorpay is an implementation/provider detail of the Soravo payment system,
   not the product identity or architectural owner; the payment/entitlement
   domain stays provider-independent (single catalog source of truth,
   server-derived user/product/price) with Razorpay as current provider per
   ADR-004. (`06`; doc §I)

Required terminology verified present via grep across the four files:
"Handy-derived foundation", "Soravo-owned product layer", "Soravo accounts",
"Soravo cloud", "Soravo entitlement system", "Soravo payment system",
"Soravo-branded fork", "fork/reuse boundary", "integration contract"
(02: 8 hits; 03: 1; 04: 4; 06: 1 — counts are per-line matches of the
alternation; each term appears at least once across the set).

## 9. Windows/macOS priority interpretation

Recorded in `02` §Platform priority (V1): Windows and macOS are the V1
priority platforms; Linux remains optional/development unless an ADR changes
scope; Linux-specific functionality must not block V1 unless authoritative
requirements explicitly make it a V1 requirement (Linux code stays isolated
per T05). No platform policy was changed — this restates the existing `02`
V1 bullet and T05 isolation rule deterministically.

## 10. Handy-derived vs Soravo-owned boundary

Recorded in `04` §Fork/reuse boundary and decision rule, with the integration
view in `03`:

- Handy-derived/local: ADOPT/ADAPT classifications + platform plumbing; runs
  locally; holds no Soravo account identity, no entitlement authority, no
  provider secrets.
- Soravo-owned product/service: SORAVO-OWNED classifications; sole authority
  for identity, entitlement, subscription, payment, release decisions.
- Integration contracts: Soravo-owned contracts in `03` (session, transcript,
  typed IPC/events, auth/account, entitlement/offline policy, model
  provenance/licensing, product/release policy) + `05` desktop contracts.
- Agent decision rule: local-only behavior change (no identity/money/
  cross-device state) → Handy-derived foundation with `21` classification;
  identity/money/cloud-state/release change → Soravo-owned product layer;
  boundary crossing must name its integration contract or require an ADR.

## 11. Planned vs implemented status treatment

New rule in `02`: every capability in the product-direction section is a
requirement and is PLANNED until it satisfies the `01` evidence vocabulary
(`IMPLEMENTED` / `VERIFIED` / `DEPLOYED` / `E2E VERIFIED`). Nothing added by
this task asserts implementation. In particular: Soravo accounts/cloud/
entitlement/payment integrations remain governed by `07` Phase 5 (Payment),
`08` T12 (Payment E2E), and `13` (payment acceptance) — none of which this
task claims as complete. No functionality was invented: each listed capability
traces to an existing requirement (`02` V1 list, `03` architecture, `06`
contracts, `08` tasks).

## 12. Verification that DESIGN.md remains authoritative

- `git diff --quiet -- docs/Soravo_Engineering_Docs_v6/DESIGN.md` → UNMODIFIED.
- `git diff --quiet -- docs/Soravo_Engineering_Docs_v6/SPEC_MANIFEST.json` →
  UNMODIFIED (`design_source_of_truth: DESIGN.md` intact; file_count 24 intact).
- New `02` text references `DESIGN.md` only as "the full `DESIGN.md` visual
  redesign remains Phase 8", reinforcing — not competing with — its authority.
- No new competing product-spec document was created inside the pack; the
  report file lives at repo root (outside the pack), consistent with existing
  `*-REPORT.md` convention.

## 13. Verification that no source/CI/MCP files changed

- `git diff --check -- docs/Soravo_Engineering_Docs_v6/` → clean.
- `git diff --stat -- docs/Soravo_Engineering_Docs_v6/` → 4 files, 48
  insertions, 0 deletions (all additions; see §6).
- `git diff --quiet -- .github/` → UNMODIFIED (no CI workflow change).
- This task's delta vs. the captured before-state is exactly the 4 v6 doc
  files (before: 98 status entries; after: 102; delta = 4 modified v6 docs).
  All other modified/tracked entries (`Cargo.toml`, `Cargo.lock`,
  `apps/desktop/...`, `crates/...`, `services/...`, `packages/...`,
  `pnpm-lock.yaml`, `docs/spec-v3/...` deletions) and all untracked report/
  worktree entries were already present in the before-state captured prior to
  any edit and were not touched. No MCP configuration, no deployment
  configuration, no source file was modified by this task.
- Forbidden-action compliance: no `Cargo.toml`/`Cargo.lock` edit, no CI edit,
  no MCP edit, no deployment edit, no commit, no push (HEAD still `ede495b5`,
  see §14).

## 14. Git status before/after

- Branch: `main`, in sync with `origin/main` (`ede495b5` —
  "docs: persist Soravo engineering control pack v6"). HEAD unchanged by this
  task (no commit).
- BEFORE (captured 2026-09-28 before edits): `git status --porcelain` = 98
  entries. Tracked modifications included `Cargo.lock`, `Cargo.toml`,
  `apps/desktop/src-tauri/{Cargo.toml, build.rs, src/actions.rs,
  src/audio_toolkit/mod.rs, src/audio_toolkit/vad/mod.rs, src/lib.rs,
  src/managers/model.rs, src/managers/model/download.rs, src/secure_input.rs,
  src/settings.rs, src/tray.rs, src/tray_i18n.rs}`, deletion of
  `apps/desktop/src-tauri/src/memory.rs`, `apps/website/src/{lib/payment-service.ts,
  pages/account.tsx, pages/pricing.test.tsx, pages/pricing.tsx}`,
  `crates/scheduler/src/lib.rs`, `packages/payment-domain/{package.json,
  src/types.ts}`, `pnpm-lock.yaml`,
  `services/license-api/src/payment/{catalog.ts, service.test.ts, service.ts}`,
  and deletions of `docs/spec-v3/*` (historical). Untracked (`??`) included
  prior `*-REPORT.md` files, `Soravo_Engineering_Docs_v6/` (root copy),
  `apps/desktop/.env.example`, new desktop audio/account/helper sources,
  `deno.lock`, `docs/archive/`, `packages/payment-domain/eslint.config.js`.
  Pre-existing stashes present (untouched).
- AFTER: `git status --porcelain` = 102 entries. Delta is exactly:
  `M docs/Soravo_Engineering_Docs_v6/02_PRODUCT_REQUIREMENTS.md`,
  `M docs/Soravo_Engineering_Docs_v6/03_TECHNICAL_DESIGN.md`,
  `M docs/Soravo_Engineering_Docs_v6/04_HANDY_FORK_AND_REUSE_POLICY.md`,
  `M docs/Soravo_Engineering_Docs_v6/06_WEB_CLOUD_PAYMENT.md`.
  Plus this new untracked report file
  (`DOCUMENTATION-PRODUCT-DIRECTION-001-REPORT.md`), which is the tasked
  output, not a pack change.
- `git diff --check` on the pack: clean. No whitespace errors introduced.

## 15. Exact remaining ambiguity, if any

1. "Appropriate" Handy-derived functionality (§A) is intentionally
   non-exhaustive: the exact retained set is determined per-subsystem by the
   `04` procedure + `21` provenance at implementation time. This is by design
   (provenance currently `UNKNOWN`), not an omission — but a future agent must
   not read the §A category list as a retention guarantee.
2. The §E priority list does not assign its items to `07` phases or `08`
   tasks beyond the two explicit mappings recorded (item 3 → T09; redesign →
   Phase 8). Sequencing of items 4–8 against Phase 5/T12 is left to the
   existing plan — priority order ≠ execution order, as stated.
3. Provider-independence (§I) is an architectural property of the
   payment/entitlement domain (single catalog, server-derived values), not a
   claim that a second provider is integrated or that swapping providers is
   cost-free. No migration path is specified (none exists in the pack).
4. The `00_README.md` "v5" title vs `SPEC_MANIFEST.json` "6.0.0" mismatch
   (§5 item 7) remains open for a future docs-hygiene pass.
5. Per `00_README.md` current-state warning, all IMPLEMENTED/VERIFIED claims
   elsewhere still require a fresh state audit; this task made no state claims.

---

STOP. Documentation edits and verification complete. No commit. No push. No
T08/T09 or source-code work begun.
