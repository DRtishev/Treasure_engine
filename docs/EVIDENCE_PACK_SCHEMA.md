# EVIDENCE PACK SCHEMA (SSOT)

This document defines the canonical evidence pack contract for `reports/evidence/EPOCH-XX/`.

## Required directory structure

- `reports/evidence/EPOCH-XX/`
  - `PREFLIGHT.log`
  - `COMMANDS.log`
  - `SNAPSHOT.md`
  - `SUMMARY.md`
  - `VERDICT.md`
  - `SHA256SUMS.EVIDENCE`
  - `pack_index.json`
  - `gates/`
    - `*.run1.log`
    - `*.run2.log`
    - other gate logs as needed

## Required files

- `PREFLIGHT.log`: runtime snapshot before gate execution (branch/SHA/node/npm/date).
- `COMMANDS.log`: exact command list used for gate execution.
- `SNAPSHOT.md`: high-level environment and evidence inventory snapshot.
- `SUMMARY.md`: factual summary derived from real gate outputs.
- `VERDICT.md`: PASS/BLOCKED based on actual observed gate outcomes.
- `SHA256SUMS.EVIDENCE`: deterministic sha256 list for files in the pack.
- `pack_index.json`: machine-readable pack index (see JSON schema).

## Machine-readable outputs

- `pack_index.json` is required for DONE epochs.
- `verify_epochXX_result.json` is required when the epoch has a dedicated epoch verifier that emits a machine-readable result.

## Determinism rules

- Hash list ordering MUST be stable and lexicographic by relative path.
- Pack generation MUST never fabricate PASS; verdict is derived from actual gate logs.
- Missing or failed gate evidence MUST produce BLOCKED in `VERDICT.md`.

## Gate log provenance

`pack_index.json.gate_runs[]` entries must reference existing files under `gates/` and include the sha256 hash of each referenced log.
