# STORAGE-CLEANUP-001 REPORT

**Date:** 2026-09-28  
**Project:** Soravo VM  
**Total Disk Usage:** ~60 GB

---

## 1. Current Total Size

| Directory | Size | Classification |
|-----------|------|----------------|
| target/ | 56 GB | BUILD ARTIFACT |
| .git/ | 1.1 GB | GIT DATA |
| node_modules/ | 554 MB | CACHE |
| .pnpm-store/ | 295 MB | CACHE |
| .opencode/ | 63 MB | TOOLING |
| .swarm/ | 34 MB | TOOLING |
| supabase/ | 16 MB | TOOLS |
| apps/ | 11 MB | SOURCE |
| services/ | 236 KB | SOURCE |
| crates/ | 504 KB | SOURCE |
| packages/ | 132 KB | SOURCE |
| docs/ | 1.7 MB | SOURCE |
| decisions/ | 124 KB | SOURCE |
| progress/ | 148 KB | SOURCE |
| tests/ | 60 KB | SOURCE |
| .swarm-worktrees/ | 1.6 MB | TOOLING |

---

## 2. Top 20 Largest Directories/Files

1. target/debug/ — 51 GB
2. target/release/ — 4.6 GB
3. target/doc/ — 578 MB
4. node_modules/ — 554 MB
5. target/entitlement-selftest/ — 103 MB
6. .pnpm-store/ — 295 MB
7. .git/ — 1.1 GB
8. .opencode/ — 63 MB
9. .swarm/ — 34 MB
10. apps/website/node_modules/ — 6.3 MB
11. apps/desktop/src-tauri/ — 2.4 MB
12. apps/desktop/dist/ — 292 KB
13. apps/website/dist/ — 668 KB
14. apps/desktop/node_modules/ — 180 KB

---

## 3. Exact Generated/Cache Directories

### Safe-to-Delete (BUILD ARTIFACT / CACHE):

| Path | Size | Reason | Regeneration Command |
|------|------|--------|---------------------|
| target/ | 56 GB | Rust build artifacts | `cargo build` |
| target/debug/ | 51 GB | Debug build | `cargo build` |
| target/release/ | 4.6 GB | Release build | `cargo build --release` |
| target/doc/ | 578 MB | Rustdoc output | `cargo doc` |
| target/entitlement-selftest/ | 103 MB | macOS entitlement test | `cargo build` |
| target/.rustc_info.json | Small | Rustc metadata | `cargo build` |
| target/.rustc_fingerprint.json | Small | Rustc fingerprint | `cargo build` |
| target/tmp/ | Small | Temporary files | N/A |
| node_modules/ | 554 MB | NPM/PNPM deps | `pnpm install` |
| apps/*/node_modules/ | 6.5 MB | App deps | `pnpm install` |
| .pnpm-store/ | 295 MB | PNPM cache | `pnpm store prune` |
| apps/*/dist/ | ~1 MB | Frontend build bundles | `pnpm build` |
| test-results/ | Tiny | Playwright test results | `pnpm test` |

### Do Not Delete (SOURCE / GIT DATA / TOOLS):

| Path | Size | Reason |
|------|------|--------|
| .git/ | 1.1 GB | Git history |
| apps/ | 11 MB | Source code |
| crates/ | 504 KB | Rust source |
| services/ | 236 KB | Source code |
| packages/ | 132 KB | Source code |
| docs/ | 1.7 MB | Documentation |
| decisions/ | 124 KB | Architecture decisions |
| progress/ | 148 KB | Progress tracking |
| tests/ | 60 KB | Test source |
| .opencode/ | 63 MB | OpenCode config |
| .swarm/ | 34 MB | Opencode swarm state |

---

## 4. Safe-to-Delete Candidates

| Candidate | Size | Safe? | Reason |
|-----------|------|-------|--------|
| target/ | 56 GB | YES | All in .gitignore, rebuildable via cargo |
| target/debug/ | 51 GB | YES | Debug artifacts, rebuildable |
| target/release/ | 4.6 GB | YES | Release artifacts, rebuildable |
| target/doc/ | 578 MB | YES | Docs, rebuildable via cargo doc |
| target/entitlement-selftest/ | 103 MB | YES | Test artifact, rebuildable |
| node_modules/ | 554 MB | YES | All in .gitignore, rebuildable via pnpm |
| apps/*/node_modules/ | 6.5 MB | YES | App deps, rebuildable |
| .pnpm-store/ | 295 MB | YES | PNPM cache, safe to prune |
| apps/*/dist/ | ~1 MB | YES | Build output, rebuildable |
| test-results/ | Tiny | YES | Playwright test results |

---

## 5. Estimated Space Recovery

| Cleanup Action | Space Freed |
|----------------|-------------|
| `rm -rf target/` | 56 GB |
| `rm -rf node_modules/` | 554 MB |
| `rm -rf apps/*/node_modules/` | 6.5 MB |
| `rm -rf .pnpm-store/` | 295 MB |
| `rm -rf apps/*/dist/` | ~1 MB |
| **TOTAL** | **~57 GB** |

---

## 6. Files/Directories That Must Remain

| Path | Reason |
|------|--------|
| .git/ | Git history (1.1 GB) |
| .opencode/ | OpenCode configuration (63 MB) |
| .swarm/ | Swarm workflow state (34 MB) |
| apps/ | Source code (11 MB) |
| crates/ | Rust source (504 KB) |
| docs/ | Documentation (1.7 MB) |
| decisions/ | Architecture decisions (124 KB) |
| progress/ | Progress tracking (148 KB) |

---

## 7. Ambiguous Items

None identified. All large directories are clearly build artifacts in .gitignore.

---

## 8. Recommended Cleanup Order

1. **First:** Clean target/ (largest impact - 56 GB)
2. **Second:** Clean node_modules/ (554 MB)
3. **Third:** Clean apps/*/dist/ (1 MB)
4. **Fourth:** Clean .pnpm-store/ (295 MB)

---

## 9. Exact Commands to Perform Cleanup

```bash
# Clean Rust build artifacts (56 GB)
rm -rf target/

# Clean Pnpm dependencies (554 MB)
rm -rf node_modules/

# Clean app build outputs (~1 MB)
rm -rf apps/*/dist/

# Clean PNPM cache (295 MB)
rm -rf .pnpm-store/

# Regenerate everything after cleanup
pnpm install
cargo build
```

---

## 10. Git Safety Verification

```bash
# Verify target/ is NOT tracked by git
git ls-files target/
# Output: (empty) - SAFE TO DELETE

# Verify node_modules/ is NOT tracked
git ls-files node_modules/
# Output: (empty) - SAFE TO DELETE

# Check git status
git status --short
# Only untracked files expected after cleanup
```

**Git Safety Status:** ✅ All proposed deletions are in .gitignore and untracked. No source code or Git history will be affected.

---

## SKILLS LOADED

| Skill | Purpose |
|-------|---------|
| rust-engineer | Rust build artifacts analysis |
| tauri | Tauri build tooling |
| securability-engineering | Repository hygiene/security |

---

## SKILLS LOADED PATHS

| Skill | Path |
|-------|------|
| rust-engineer | /home/maya/.agents/skills/rust-engineer/ |
| tauri | /home/maya/.agents/skills/tauri/ |
| securability-engineering | /home/maya/.agents/skills/securability-engineering/ |

---

**END OF REPORT**

**NEXT STEP:** Review and confirm cleanup commands before execution.
