# SUMMARY (EPOCH-23)

## What changed
- Added deterministic AI->signal bridge module (`core/ai/ai_signal_bridge.mjs`).
- Added `verify:epoch23` gate (`scripts/verify/epoch23_signal_intent_contract_check.mjs`) for AI->Signal->Intent contract determinism.
- Wired `verify:epoch23` into `verify:wall` and updated EPOCH docs/index + README/RUNBOOK.
- Refreshed boot manifests/export checksum to keep release wall stable.

## Verification results
- `verify:epoch23` passed twice.
- Mandatory gates passed: `verify:core`, `verify:phase2`, `verify:integration`.
- `verify:wall` passed with epoch23 included.
- EPOCH-23 source/evidence manifests validated.

## Limits
- This epoch adds deterministic bridge + contract verification; it does not yet execute live AI models in production path.
