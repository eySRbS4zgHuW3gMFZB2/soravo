# 08 — Deterministic Task Breakdown

Tasks are atomic. Do not begin a later task while its prerequisite is BLOCKED
unless an ADR explicitly authorizes parallel work.

## T01 — State audit
Acceptance:
- local SHA and origin SHA recorded;
- branch/worktree recorded;
- CI/deployment state recorded;
- dirty work classified;
- MCP/skills inventory recorded.

## T02 — CI baseline restoration
Acceptance:
- web lint passes;
- Rust fmt passes;
- required desktop crates are workspace members or explicitly excluded;
- desktop build gate has a reproducible failure or PASS;
- root test commands collect the intended suites.

## T03 — Handy source chain-of-custody
Acceptance:
- exact upstream repo + SHA recorded;
- import/adaptation files enumerated;
- license evidence recorded;
- `842acdf9` is either proven relevant or explicitly retired as stale;
- no provenance claim remains UNKNOWN without a blocker.

## T04 — Desktop compiler recovery
Acceptance:
- reproduce first compiler error;
- fix only the first coherent root cause;
- targeted compile passes;
- no broad unrelated dependency churn.

## T05 — GTK/layer-shell
Acceptance:
- exact installed `gtk4-layer-shell` API verified;
- correct trait imported;
- overlay behavior preserved;
- Linux-specific code remains isolated;
- non-Linux build unaffected.

## T06 — hf-hub
Acceptance:
- locked `hf-hub` API verified;
- model/cache/revision code compiles;
- download/cache tests pass;
- no use of private upstream APIs.

## T07 — rodio/CPAL
Acceptance:
- one coherent CPAL version strategy;
- no incompatible CPAL types crossing APIs;
- feedback path tested;
- capture path remains unchanged unless required;
- strategy documented in ADR if versions must be changed.

## T08 — Missing crate/workspace reconciliation
Acceptance:
- every crate is workspace member or explicitly excluded;
- dependencies match actual imports;
- no dependency is added solely to suppress an error;
- lockfile is reproducible.

## T09 — Handy branding/rebrand
Acceptance:
- no user-facing Handy branding remains where Soravo branding is required;
- required attribution/license notices remain;
- source classification report exists.

## T10 — Model licensing
Acceptance:
- exact artifact;
- publisher;
- source URL;
- license;
- commercial use;
- redistribution;
- hosting;
- checksum;
- provenance;
- release decision.

Unknown license = BLOCKED for that model.

## T11 — STT benchmark
Acceptance:
- fixed corpus/hardware/build;
- latency/resource/quality measurements;
- raw evidence retained;
- no unsupported performance claims.

## T12 — Payment E2E
Acceptance:
- lifetime TEST path complete;
- monthly TEST path complete;
- webhook signature/ledger/entitlement evidence;
- account display verified;
- desktop recognition verified where applicable.

## T13 — Website redesign
Acceptance:
- implement `DESIGN.md`;
- preserve auth/payment behavior;
- no third-party brand assets;
- responsive/accessibility/visual regression evidence.

## T14 — Release
Acceptance:
- required CI green;
- desktop artifacts reproducible;
- model licenses clear;
- payment release gate clear;
- security complete;
- clean-machine install passes.
