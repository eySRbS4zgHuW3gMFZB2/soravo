# 13 — Release Runbook

## 1. Pre-release

- clean git status;
- all required tests pass;
- security review pass;
- TestSprite release test pass;
- benchmark report current;
- website legal pages present;
- pricing verified;
- Razorpay sandbox lifecycle verified;
- model licenses checked;
- release notes written.

## 2. Build

Build macOS and Windows in CI/reproducible environments.

Record:
- commit SHA;
- app version;
- build environment;
- target architecture;
- model versions;
- checksums.

## 3. Artifact verification

Verify:
- expected files;
- expected version;
- checksums;
- package signature where configured;
- no debug builds;
- no secrets.

## 4. GitHub Release

Create a release tied to a version tag.

Attach:
- macOS artifacts;
- Windows artifacts;
- checksums;
- release notes.

## 5. Website

Update download links only after artifacts are verified.

Do not publish broken links.

## 6. Post-release smoke

Fresh machine:
- install;
- launch;
- account login;
- microphone;
- hotkey;
- dictation;
- text injection;
- model loading;
- update path.

## 7. Rollback

If a P0/P1 issue appears:
- stop promoting release;
- mark affected version;
- publish rollback/previous-good version;
- communicate status;
- create incident record;
- patch;
- rerun release gates.

## 8. Public communication

Never claim:
- cloud privacy features that do not exist;
- benchmark numbers not measured;
- unsupported OS;
- payment capabilities not enabled;
- security certifications not held.
