# Soravo Supply Chain Security Policy

## Overview

This document establishes automated supply-chain security requirements for Soravo. All new dependencies must pass these checks before merging.

## Automated Checks

### Rust (Cargo)

| Check | Tool | Failure Condition |
|-------|------|-------------------|
| Vulnerability scan | `cargo audit` | Any advisory with severity >= medium |
| License compliance | `cargo deny check licenses` | License not in allowed list |
| Source provenance | `cargo deny check sources` | Unapproved source (not crates.io or approved git) |

### JavaScript (pnpm)

| Check | Tool | Failure Condition |
|-------|------|-------------------|
| Vulnerability scan | `pnpm audit --prod` | Any high/critical CVE |
| License compliance | Manual review | Non-OSI license without approval |

## Allowed Licenses

### Primary Dependencies
- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- Unlicense
- CC0-1.0

### Acceptable with Review
- MPL-2.0 (weak copyleft)
- EPL-2.0 (Java ecosystem)
- Any license approved by Soravo Engineering

### Prohibited
- GPL/LGPL (copyleft)
- AGPL
- Proprietary without explicit agreement

## Dependency Sources

### Approved Sources
- crates.io (Rust)
- npmjs.org (JavaScript)
- GitHub commits with explicit SHA pinning and documented rationale

### Requiring Approval
- Git dependencies (document in decisions/ with security review)
- Non-standard registries
- Private/internal repositories

## Policy Exceptions

### Existing Advisory: h2 0.3.27 (GHSA-q83h-524g-xf6h)
- **Status**: Pre-existing low severity advisory
- **Rationale**: Transitive dependency via reqwest; upgrade path requires major version bump of async HTTP stack
- **Review**: Re-evaluate on each major reqwest update
- **Action**: Documented exception; no blocking action required

### Git Dependency: vad-rs
- **Source**: https://github.com/cjpais/vad-rs (pinned SHA)
- **Rationale**: Upstream not on crates.io; ported from Handy foundation
- **Policy**: Maintain SHA pinning; review upstream repo weekly for security updates

## CI Integration

All checks run on every PR and push to main. CI fails on:
- cargo audit with medium/critical findings
- pnpm audit with high/critical CVEs
- Any license violation

## Monitoring

- Dependabot runs weekly dependency updates
- Manual review of `cargo deny` license report on each major dependency change
- Quarterly review of approved exceptions

## Contacts

For exceptions or policy questions: soravo-engineering@example.com