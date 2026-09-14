# Next

Resume task: FOUNDATION-AUDIT remediation
Read first: `progress/FOUNDATION_AUDIT.md`, `progress/STATUS.md`, `03_AI_INSTRUCTIONS.md`, and `09_SECURITY_BASELINE.md`.
Inspect: writable Git availability, GitHub CLI authentication, DNS/proxy state, Linux Tauri prerequisite packages, `package.json`, and `Cargo.toml`.
Exact next implementation step: In an environment with a real writable `.git`, initialize/restore the repository without destroying current files. In a privileged environment with DNS, install the documented Linux Tauri packages, generate an official shadcn component with `pnpm --filter @soravo/website exec shadcn add button`, and run Rust gates.
Tests to run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`, `cargo fmt --all -- --check`, `cargo check --workspace`, `cargo test --workspace`, and `cargo clippy --workspace --all-targets -- -D warnings`.
Security checks: Confirm no `.env` files are tracked, re-run secret scan and dependency audit, inspect Tauri capabilities/CSP, and pin reviewed dependency versions.
Expected completion condition: Git is a real repository; GitHub auth/project scope is known; Rust gates pass; Tailwind/shadcn plan is reviewed and installed; MCP/TestSprite status is recorded accurately; CI/checkpoint workflow is actionable.
Do not change: Do not start Phase 1, add cloud accounts, mutate production resources, select an STT engine, or relax local-first privacy/security boundaries.
