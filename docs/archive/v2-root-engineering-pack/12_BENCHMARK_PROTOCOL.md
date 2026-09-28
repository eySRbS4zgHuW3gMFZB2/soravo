# 12 — STT Benchmark Protocol

## Purpose

Choose the fastest acceptable local engine instead of selecting by reputation.

## Candidates

At minimum:
- Parakeet candidate(s)
- Whisper candidate(s)
- native/runtime variants where practical

## Dataset

Create a representative local dataset:
- short commands;
- normal dictation;
- long-form speech;
- punctuation-heavy speech;
- names;
- technical vocabulary;
- numbers;
- fast speech;
- accented speech;
- pauses;
- noisy samples.

Do not upload private user recordings.

## Metrics

### Latency
- capture start
- first partial
- first stable partial
- finalization

### Throughput
- real-time factor

### Quality
- WER
- CER where useful
- punctuation accuracy
- capitalization
- named entity preservation

### Stability
- duplicate rate
- revision rate
- committed-prefix stability

### Resources
- peak RAM
- steady RAM
- CPU
- GPU
- model load time
- cold start
- warm start

### Packaging
- binary size
- model size
- platform availability
- licensing
- dependency complexity

## Procedure

For each candidate:
1. fixed hardware;
2. fixed audio;
3. fixed sample rate;
4. fixed test corpus;
5. release build;
6. warm and cold runs;
7. repeat enough times to reduce noise;
8. record results;
9. produce a comparison report.

## Decision

Select the backend based on weighted evidence:
- latency;
- quality;
- stability;
- resource usage;
- licensing;
- platform support;
- maintainability.

Parakeet is the default primary candidate, not an unconditional mandate if benchmarks prove another design is superior.

## Public claims

Never claim “fastest” or a numeric latency publicly until benchmark evidence exists.
