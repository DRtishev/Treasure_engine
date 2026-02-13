# EPOCH-52 — Canary Controller (Shadow → Paper → Guarded Live)

## REALITY SNAPSHOT
- Current baseline includes deterministic E51 paper harness and strict REAL calibration.
- Missing piece: a canary controller state machine spanning SHADOW, PAPER, and GUARDED_LIVE.
- Evidence root for this epoch: `reports/evidence/EPOCH-52/`.

## GOALS
- Implement deterministic canary controller with strict safety invariants.
- Enforce no-submit hard fuse while producing hypothetical submission plans in GUARDED_LIVE mode.
- Add monitor stack (reality gap, risk, overfit) with deterministic auto-pause behavior.

## NON-GOALS
- No real exchange submission.
- No network requirement in default verification path.
- No bypass of E44 hard-stop behavior.

## CONSTRAINTS
- `submitted` must always be `false` in all modes.
- All mode decisions must be deterministic with identical seed/input.
- Strict mode must fail if overfit metrics are unavailable.

## DESIGN / CONTRACTS
- Canonical policy documented in `docs/CANARY_POLICY.md`.
- Config schema + deterministic validation in `core/canary/canary_config_contract.mjs`.
- Controller runner in `core/canary/canary_runner.mjs` with append-only state events.

## PATCH PLAN
- [ ] Add canary policy SSOT and config contract.
- [ ] Implement deterministic canary runner with three modes.
- [ ] Add monitor stack and strict expected-fail behavior.
- [ ] Add `verify:epoch52` machine outputs and pass gate twice.

## VERIFY
- `npm run verify:epoch52`
- `npm run verify:specs`
- `npm run verify:repo`
- `npm run verify:edge`
- `npm run verify:ledger`
- `npm run verify:treasure`
- `npm run verify:release`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-52/PREFLIGHT.log`
- `reports/evidence/EPOCH-52/COMMANDS.log`
- `reports/evidence/EPOCH-52/SNAPSHOT.md`
- `reports/evidence/EPOCH-52/SUMMARY.md`
- `reports/evidence/EPOCH-52/VERDICT.md`
- `reports/evidence/EPOCH-52/SHA256SUMS.EVIDENCE`
- `reports/evidence/EPOCH-52/pack_index.json`

## STOP RULES
- BLOCKED if `verify:epoch52` fails twice.
- BLOCKED if deterministic fingerprints diverge across repeated runs.
- BLOCKED if guarded-live plan marks any action as submitted.

## RISK REGISTER
- Monitor thresholds may require retuning for broader datasets.
- Overfit metrics schema changes can tighten strict-mode behavior.
- Guarded-live intents are hypothetical and not exchange-validated.

## ACCEPTANCE CRITERIA
- [ ] SHADOW mode emits deterministic report + state log with no submission plan.
- [ ] PAPER mode consumes E51 harness and emits paper metrics with no submission plan.
- [ ] GUARDED_LIVE emits `submission_plan.json` with `submitted=false` and 0 real side effects.
- [ ] Determinism holds across two identical runs via stable fingerprint.
- [ ] Crisis-injected scenario triggers auto-pause.

## NOTES
E52 remains offline-first and no-submit by design; live execution enablement is deferred to a later epoch.
