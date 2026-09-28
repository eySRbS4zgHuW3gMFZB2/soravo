# 05 — Desktop Contracts
Session:
`IDLE → STARTING → LISTENING → TRANSCRIBING → FINALIZING → DONE → IDLE`
Failure: `ANY → ERROR → IDLE`.

Invariants:
- session IDs are mandatory;
- stale results are rejected;
- cancellation is safe;
- transitions are validated.

Transcript:
- tentative = UI only;
- committed = stable/injectable;
- final = complete/injectable;
- never duplicate, overlap, retype unstable text or accept late stale chunks.

IPC:
- typed payloads;
- validate all inputs;
- structured errors;
- no secrets;
- no arbitrary shell/process access.

Typing:
committed/final → native insertion OR clipboard fallback.
Clipboard fallback snapshots, writes, pastes, restores safely and reports failure.

Audio:
warm capture where feasible; bounded callback; timestamped frames; no inference/network/filesystem in callback; pre-roll protects first phoneme.

Models:
load only after metadata, checksum, compatibility and licensing gates pass.

Entitlements:
desktop receives minimum necessary data; cache is bounded/tamper-evident according to explicit offline policy.

Tauri:
least privilege, restrictive CSP, typed IPC, validated paths, no arbitrary process execution.
