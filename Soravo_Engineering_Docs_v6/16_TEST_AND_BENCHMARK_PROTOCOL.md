# 16 — Test and Benchmark Protocol
Record for STT benchmarks:
OS, architecture, CPU, RAM, GPU, commit, toolchain, engine, model/version, input format, speech duration.

Measure:
startup; hotkey-to-capture; first useful partial; finalization; injection; CPU/GPU; memory; stability; WER/CER where reference transcripts exist.

Targets, not claims:
warm capture <50 ms; first useful partial <300 ms; speech-end to final <500 ms; committed injection <50 ms; warm startup <2 s.

Compare engines with identical corpus/hardware/method.

Payment evidence:
checkout metadata, provider order/subscription ID, webhook event ID, ledger state, entitlement state, account display and desktop recognition.
Never record card number/CVV/secrets/tokens.

Webhook tests:
valid/invalid signature, altered payload, duplicate, retry, malformed event, unsupported product, user mismatch, refund, cancellation, renewal.

Fixtures must be labeled provider-documented, synthetic or real TEST capture.
