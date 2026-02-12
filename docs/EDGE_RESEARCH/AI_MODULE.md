# EDGE AI Module Governance (Hard Policy)

## Allowed behavior
- Deterministic inference only from pinned model artifacts and pinned prompts.
- Offline default operation from local model registry.
- Produces auditable `Signal`/`Intent` payloads conforming to `CONTRACTS_CATALOG.md`.
- Emits replay bundle with seed, model digest, prompt digest, and output digest.

## Forbidden behavior
- Autonomous order placement or trading side effects.
- Hidden network calls unless `ENABLE_NETWORK_TESTS=1` is explicitly set for a dedicated gate.
- Dynamic dependency downloads during gate execution.
- Prompt mutation at runtime without manifest update.
- Access to future bars or post-event labels.

## Replay drift definition and gates
Replay drift is any output divergence for same `{input_digest, model_digest, prompt_digest, seed}`.

Required gates:
1. `verify:epoch34` deterministic replay equality (byte-identical canonical JSON).
2. `verify:epoch37` leakage sentinel replay consistency.
3. `verify:epoch39` shadow mode no-order invariant.

Evidence required:
- `replay/input_manifest.json`
- `replay/output_run1.json`
- `replay/output_run2.json`
- `replay/diff.txt` (must be empty for PASS)

## Model registry and promotion
- Registry location: local repository or mounted offline artifact store.
- Promotion states: `candidate -> staged -> approved`.
- Promotion requires: deterministic replay pass, leakage pass, and signed evidence manifest digest.
- No default path may require external model pulls.

## Leakage controls
- Feature timestamps must satisfy `feature_ts <= decision_ts`.
- Train/validation splits must be immutable and hashed.
- Sentinel must include positive and negative controls.
- Any leakage signal is hard FAIL and sets epoch state to BLOCKED.
