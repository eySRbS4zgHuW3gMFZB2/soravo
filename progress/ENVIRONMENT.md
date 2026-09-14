# Environment audit

Date: 2026-09-14

- OS: Ubuntu 24.04-derived Linux VM, x86_64 (development only; Linux is not a V1 distribution target)
- CPU: AMD Ryzen 5 5600, 4 exposed vCPUs
- RAM: 7.6 GiB total, 4.3 GiB available at audit
- Shell: bash
- Git: 2.43.0 (repository unavailable because `.git` is a read-only placeholder mount)
- GitHub CLI: 2.100.0
- Node.js: 22.23.1
- npm: 10.9.8
- pnpm: 11.17.0
- Rust: rustc/cargo 1.97.1
- Python: 3.12.3
- Tauri CLI: `@tauri-apps/cli` 2.11.4 is installed as a desktop workspace development dependency; the Linux system libraries required to build it are missing
- Wrangler: not installed
- Supabase CLI: not installed
- TestSprite MCP: not available

Audit correction (2026-09-14): Cargo dependencies are cached and `Cargo.lock` exists, but offline Rust compilation fails because `glib-2.0`, `gobject-2.0`, `gio-2.0`, `gtk+-3.0`, and `webkit2gtk-4.1` development metadata are absent. Required Ubuntu packages are `libglib2.0-dev`, `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, and `librsvg2-dev`. The container has no effective DNS for public registries and no root privileges, so these documented Linux Tauri packages cannot be installed here.

Frontend remediation (2026-09-14): Tailwind CSS v4, `@tailwindcss/vite`, and shadcn's documented package baseline are installed and recognized in both Vite apps. Official shadcn component retrieval from `ui.shadcn.com` is DNS-blocked; no custom substitute was created.

No account credentials, secrets, or cloud projects were inspected or created.
