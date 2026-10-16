# MIC-CAPTURE Zero-Sample Diagnosis (2026-10-11)

**Task:** read-only diagnosis of why Soravo's mic stream opens and signals ready but
returns zero retrievable samples. No source/settings/audio/routing change made; no
commit/push/merge/deploy; no rebuild; fix worktree untouched.

## Verdict

**Strongest evidence-backed cause: the guest audio device delivers bit-exact digital
silence (all-zero PCM) during live operator speech — the fault is UPSTREAM of the app
(VM/host audio input path), not in Soravo's capture code.** The app behaved correctly
given a silent input. Root-cause class: PROVEN at guest level (see §2). Which
host-side link broke (host mic muted/unplugged/reassigned vs VBox audio-input
attachment) is UNKNOWN — host/VBox settings are out of scope to inspect or change.

## Evidence

### 1. App pipeline traced (read-only, `crates/audio/src/audio/recorder.rs`)

- `open(device: None)` → cpal `default_host()` (ALSA on Linux) default input device →
  `get_preferred_config` → 44.1 kHz F32 (matches log) → `build_input_stream` with rtrb
  ring → `stream.play()`. No error at any step (init `Ok`, no `stream_error` flag, no
  "Microphone backend reported a stream error").
- cpal callback `write_input_to_ring` pushes frames to the ring; consumer thread
  `run_consumer` drains with `Capture` disposition while recording.
- Transcribe binding policy (`actions.rs:551`): `vad_enabled=true` + parakeet
  `supports_streaming=true` → **`VadPolicy::Streaming`**: every frame passes Silero VAD;
  `VadFrame::Noise` frames are DROPPED from `processed_samples`.
- Silero VAD live: `target/debug/resources/models/silero_vad_v4.onnx` staged by the
  rebuild; log `Initialized Silero VAD backend (480 samples/frame)`.
- VAD failure modes are fail-OPEN (`push_frame` error → emit as Speech; no detector →
  emit). A broken VAD would produce MORE samples, not zero.
- Zero-sample log sequence (both supervised attempts + `Soravo.log` tail): stream opened
  → `first audio samples arrived (42.0ms drained)` → `first captured samples processed`
  → `recording is ready` → on release `sample count: 0` → `skipping persistence`.
- Pause handshake at stop SUCCEEDED (`acknowledge_pause_after_write` runs inside the
  callback) → the cpal callback was alive at stop; combined with fail-open VAD, empty
  `processed_samples` means **no speech energy ever reached the consumer** — either
  all-zero frames gated as Noise, or an initial burst followed by empty callbacks.

### 2. Guest device delivers zeros during live speech (PROVEN, discriminating check)

- Operator-vocalized `arecord -d 8 -f S16_LE -r 16000 -c 1 /tmp/opencode/mic-diag.wav`
  (T22 §3 procedure, /tmp only, nothing altered): 256,044 bytes = exact expected length.
- `od` spot peaks at sec 0/1/3/5/7: all 0. Whole-file `od` collapses to `*` (all lines
  identical zeros) → **global peak 0 over 128,000 samples / 8 s of operator speech**.
- Guest mixer state healthy (read-only): PipeWire `alsa_input…analog-stereo` SUSPENDED
  (idle), Mute: no, Volume 100%; ALSA Mic capture [on], Capture 15 [100%] [on];
  card `Intel 82801AA-ICH`. Device listing is NOT taken as health proof — the arecord
  zeros are the proof of silence.

### 3. Regression vs yesterday (T22-LIVE-MIC-E2E-REPORT.md, 2026-10-10)

- Identical procedure then: 160,044-byte file with peaks ≈7,420 (≈ −13 dBFS) — genuine
  speech on the same Intel MIC ADC via system default; in-app 4/4 runs with 28k–161k
  samples and transcripts. The guest/host input path REGRESSED between 2026-10-10 and
  today. (VM uptime/reboot history not collected — `last` query blocked by session
  shell policy; non-essential.)

## Why the app yields zero samples (proven chain)

Host/guest input path feeds digital silence → cpal stream opens normally on a live but
silent device → Silero VAD (Streaming) marks every all-zero frame Noise → nothing
accumulates in `processed_samples` → `finish_recording` returns empty vec →
`sample count: 0` → skip path. **Not an app defect; the duplicate-insertion fix is
neither validated nor invalidated by this result.**

## Leading hypotheses for the upstream silence (all upstream of the app)

1. Host microphone muted, unplugged, or default-input reassigned since T22 (most likely —
    nothing in-guest changed: mixer unmuted/100%, device names identical).
2. VirtualBox audio-input attachment lost (e.g. across VM restart) — in-guest
    re-verification impossible; host-side check required.
3. PipeWire/ALSA guest routing change — unlikely (volumes/mutes/routing verified
    unchanged and healthy; arecord reaches the device and gets clean zeros, not errors).

## Single smallest operator-authorized discriminating action (NOT performed)

On the HOST (or any host-side audio settings UI the operator trusts): verify the host
microphone is present, unmuted, set as host default input, and selected for this VM's
audio input — then re-run ONLY the 8 s `arecord` + peak check above (no app launch
needed). Non-zero peaks → guest path restored → repeat supervised acceptance. Still
zeros → inspect VirtualBox VM audio-input attachment (host-side, separate authorization).

## Session footprint

- Read-only commands: `arecord` (1× 8 s, /tmp only), `od`/`awk` spot + whole-file peaks,
  `pactl list`, `cat /proc/asound/cards`, `amixer sget`, `grep`/`sed -n` source reads,
  `ls`, log tail reads. One compound command and one `last reboot` query refused by
  session shell policy (retried in simpler form; uptime check skipped as non-essential).
- Skills: invocation tool exists in this session, but NO skill in the matrix covers
  Linux audio capture (cpal/ALSA/PipeWire/VAD) diagnosis — `tauri` (launch only) and all
  others inapplicable — so none was invoked. Stated accurately per instructions.
- Files: this report (new, root); `PROGRESS.md` (append-only entry); `/tmp` wav + logs
  preserved as evidence. Acceptance report and all prior evidence untouched. No app
  process launched or running (Soravo NOT started this session).
