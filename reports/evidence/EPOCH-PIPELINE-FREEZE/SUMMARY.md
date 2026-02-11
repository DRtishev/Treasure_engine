# SUMMARY
## What changed
- Removed hardcoded evidence epoch coupling by adding shared evidence path resolver (`EVIDENCE_EPOCH` + latest-folder fallback).
- Replaced hardcoded `verify:wall` npm one-liner with `scripts/verify/wall.mjs` using dynamic evidence paths.
- Hardened `regen_manifests` recursion filters to avoid self-checksum drift and to support clean-clone runs without `.git`.
- Updated release governor wall-log detection and dynamic evidence selection.
- Updated runbook command docs to match current canonical wall pipeline and environment variable behavior.

## Results
- Canonical freeze gates executed with anti-flake repeats and multi-seed checks.
- Manifests regenerated and `sha256sum -c` checks passed for SOURCE/EVIDENCE/EXPORT.
- Clean-clone rehearsal passed (`npm ci`, `verify:core`, `verify:wall`, `verify:release-governor`).
- Validated export produced.

## Hashes
- FINAL_VALIDATED.zip: `27e4f94afdfa4e839612720d54bb72c1958630a33455bb9b6ce333e2cae8f590`
- FINAL_VALIDATED.zip.sha256: `8da6ea6d103a3c4d24e67b50a5cc151efb7cb3d15d112f779031325d8c70ad47`

## Remaining limits
- npm prints `Unknown env config "http-proxy"` warnings from user env; treated as non-blocking noise with no gate impact.
