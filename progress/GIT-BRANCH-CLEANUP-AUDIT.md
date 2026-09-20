# Git Branch Cleanup Audit

**Audit Date:** 2026-09-20  
**Audit Branch:** audit/branch-cleanup-2026-09-20  
**Main Commit:** 5857cd81

---

## Summary

| Metric | Value |
|--------|-------|
| Open PRs | 11 (8 Dependabot, 3 feature) |
| Remote Branches | 25 |
| Merged Branches Safe to Delete | 21 |
| Branches with Unmerged Work | 2 |

---

## Active Branches Worth Keeping

| Branch | Status | Notes |
|--------|--------|-------|
| SETTINGS-FOUNDATION-implementation | Open PR #51 | Active feature work |
| DESKTOP-006-account-entitlement-ui | Open PR #50 | Active feature work |
| audio/capture-001 | Open PR #26 | Active feature work |
| feature/CLOUD-009-payment-service-skeleton | Local, 1 commit ahead of main | Unmerged work |
| feat/stt-005-desktop-integration | Local, PR tracking | Has staging entries |

---

## Merged Branches Safe to Delete (21 branches)

All merged into main, no unique unmerged work:

### Feature Branches (18)
1. feature/CLOUD-012-entitlement-backend-foundation (#48)
2. feature/supply-chain-audit (#39)
3. feat/stt-004-whisper-production-adapter (#38)
4. stt-003-streaming-transcription (#37)
5. fix/pending-transition-lint (#36)
6. typing/clipboard-injection-002-003 (#35)
7. feature/stt-002-benchmark-harness (#33)
8. docs/handy-reuse-first-policy (#34)
9. feature/audio-001-007-capture (#31)
10. feature/model-002-downloader (#30)
11. feature/type-001-native-insertion (#29)
12. feature/transcript-stabilization (#28)
13. feature/task-2-3-hotkeys-platform-registration (#28)
14. feature/task-1-2 (#25)
15. phase1/task1.1-port-handy (#24)
16. plan/handy-v1-execution (#23)
17. docs/handy-v1-strategy-update (#22)
18. docs/web-012-deploy-complete (#21)

### PR Tracking Branches (3)
19. pr/31
20. pr/32
21. pr/32-force

---

## Dependabot Branches (8)

All created today, pending review/merge:
- dependabot/cargo/rubato-5.0.0 (#47)
- dependabot/cargo/cocoa-0.27.0 (#46)
- dependabot/npm_and_yarn/apps/desktop/typescript-7.0.2 (#45)
- dependabot/npm_and_yarn/apps/desktop/types/node-26.6.1 (#44)
- dependabot/cargo/thiserror-2.0.20 (#43)
- dependabot/npm_and_yarn/apps/desktop/lucide-react-1.47.0 (#42)
- dependabot/cargo/sha2-0.11.0 (#41)
- dependabot/cargo/cpal-0.18.2 (#40)

---

## CI State

**Status:** RED - 3 consecutive failures on main

| Workflow | Status | Root Cause |
|----------|--------|------------|
| CI (rust) | RED | cargo clippy warnings treated as errors |
| CI (desktop) | RED | Tauri desktop build compilation error |
| Security Audit | RED | cargo audit dependency vulnerabilities |
| Deploy website | GREEN | All recent runs passed |

**Last Successful Run:** Sep 19, 2026 20:05 UTC (PR #38)

---

## Security Audit Baseline

### Currently Ignored Advisories (deny.toml)

| ID | Reason | Valid |
|----|--------|-------|
| RUSTSEC-2024-0370 | proc-macro-error unmaintained (transitive via glib→gtk→tauri) | ✅ Justified |
| RUSTSEC-2025-0081 | unic-char-property unmaintained (transitive via urlpattern) | ✅ Justified |
| RUSTSEC-2025-0075 | unic-char-range unmaintained (transitive via urlpattern) | ✅ Justified |
| RUSTSEC-2025-0080 | unic-common unmaintained (transitive via urlpattern) | ✅ Justified |
| RUSTSEC-2025-0100 | unic-ucd-ident unmaintained (transitive via urlpattern) | ✅ Justified |
| RUSTSEC-2025-0098 | unic-ucd-version unmaintained (transitive via urlpattern) | ✅ Justified |

All unic-* advisories are transitive dependencies via urlpattern → tauri-utils → tauri. They are unmaintained but have no runtime security impact.

---

## Recommended Cleanup Actions

### Phase 1: Fix CI (Blocker)
1. Fix cargo clippy warnings in workspace
2. Fix Tauri desktop build compilation errors
3. Review and fix or properly ignore dependency vulnerabilities

### Phase 2: Branch Cleanup (Post-CI Green)
```bash
# Delete merged branches
git push origin --delete feature/CLOUD-012-entitlement-backend-foundation
git push origin --delete feature/supply-chain-audit
# ... repeat for all 21 merged branches
```

### Phase 3: Review Unmerged Work
- Verify feature/CLOUD-009-payment-service-skeleton (1 commit ahead of main)
- Review feat/stt-005-desktop-integration staging entries

---

## Actions Taken

1. Created audit branch: audit/branch-cleanup-2026-09-20
2. Documented all branches and their status
3. Verified CI state and security configuration

## Next Steps

- [ ] Fix main CI (clippy + desktop build + audit)
- [ ] Review and merge/skip Dependabot PRs
- [ ] Delete 21 merged branches
- [ ] Decide on feature/CLOUD-009-payment-service-skeleton
