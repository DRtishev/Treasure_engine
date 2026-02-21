# VERIFY_MODE.md — Verification Mode SSOT

version: 1.0.0
ssot_type: VERIFY_MODE
last_updated: 2026-02-21

## Active Mode

```
VERIFY_MODE: GIT
```

## Mode Definitions

### GIT (default)
- RUN_ID derived from `git rev-parse --short=12 HEAD`
- Requires `.git` directory to be present
- Used in: local development, CI/CD with git checkout
- Fallback to GITHUB_SHA if set (CI environment)

### BUNDLE
- RUN_ID derived from bundle manifest fingerprint
- Requires one of:
  - `BUNDLE_COMMIT_SHA_SHORT` env var matching `^[0-9a-f]{7,12}$`
  - `SOURCE_FINGERPRINT` env var matching `^sha256:[0-9a-f]{64}$`
- Used in: offline capsule deployments, air-gapped environments
- See: BUNDLE_CONTRACT.md

## Override

Set `TREASURE_RUN_ID` env var to override RUN_ID entirely (highest priority).
Must be identical across both runs in x2 anti-flake check.

## Reason Codes

- VM01: BLOCKED — BUNDLE mode but manifest missing required fingerprint field
- VM02: FAIL — BUNDLE checksums mismatch
- VM03: BLOCKED — GIT mode but .git missing
- VM04: FAIL — Bundle fingerprint malformed (bad BUNDLE_COMMIT_SHA_SHORT / SOURCE_FINGERPRINT)
- D001: BLOCKED — RUN_ID cannot be resolved deterministically
