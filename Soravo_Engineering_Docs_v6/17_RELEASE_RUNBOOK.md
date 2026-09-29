# 17 — Release Runbook
Preconditions:
- required CI green;
- target desktop builds verified;
- model licenses verified;
- payment E2E verified;
- security complete;
- no unresolved P0/P1;
- reproducible artifacts.

Record commit, toolchain, artifact names, checksums and signatures.

macOS/Windows signing credentials remain external secrets.

After artifact publication:
- update download page;
- verify installers;
- verify updater;
- clean-machine install;
- verify account download links.

Do not switch Razorpay TEST to LIVE merely because code is ready. LIVE activation requires business/provider approval, LIVE secrets, production webhook configuration and approved production smoke process.

Rollback must preserve entitlement/payment integrity.
