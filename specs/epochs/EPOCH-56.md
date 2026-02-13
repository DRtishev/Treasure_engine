# EPOCH-56 — TRICKPACK-01 (Fitness v2 + Vault Holdout + Pause-Recover)

## REALITY SNAPSHOT
- E53 fitness can collapse to ties and lacks transparent per-scenario decomposition.
- Vault holdout policy was not enforced in tuning sweeps.
- Pause behavior existed, but deterministic recovery protocol trace was missing.
- Evidence root: `reports/evidence/EPOCH-56/`.

## GOALS
- Implement discriminative fitness score v2 with transparent formula and per-scenario metrics.
- Enforce dataset tier policy with frozen vault holdout and strict expected-fail for tuning.
- Add deterministic pause-recover trace that remains shadow/paper only and respects E44 hard stops.
- Add `verify:epoch56` gate with determinism x2 and machine outputs.

## NON-GOALS
- No live submissions.
- No network requirement for default PASS.
- No relaxing of hard-stop policy.

## DESIGN / CONTRACTS
- Fitness v2: `core/paper/paper_fitness_lab.mjs`.
- Tier policy: `core/data/dataset_tier_policy.mjs` + dataset manifest `tag.tier`.
- Recovery trace: `core/canary/canary_runner.mjs`.
- Gate: `scripts/verify/epoch56_trickpack01.mjs` via `npm run verify:epoch56`.

## REQUIRED OUTPUTS
- `reports/evidence/EPOCH-56/gates/manual/epoch56_fitness_v2.json`
- `reports/evidence/EPOCH-56/gates/manual/vault_policy_test.json`
- `reports/evidence/EPOCH-56/gates/manual/pause_recover_trace.jsonl`
- `reports/evidence/EPOCH-56/gates/manual/verify_epoch56_result.json`

## VERIFY (x2, CI=true)
- `npm ci`
- `CI=true npm run verify:specs`
- `CI=true npm run verify:repo`
- `CI=true npm run verify:edge`
- `CI=true npm run verify:epoch56`
- `CI=true npm run verify:ledger`
- `RELEASE_BUILD=1 CI=true npm run verify:release`

## ACCEPTANCE CRITERIA (FALSIFIABLE)
- [ ] Fitness v2 emits `pnl_net,max_dd,trade_count,pause_count,risk_events_count,stability_penalty,data_quality_penalty` per scenario.
- [ ] At least two fixture scenarios produce different fitness scores unless full metric vectors are identical.
- [ ] Strict tuning fails when a vault dataset tier is used (`FAIL_VAULT_DATASET_FOR_TUNING`).
- [ ] Pause-recover trace deterministically follows `RECOVERY->COOLDOWN->SHADOW->PAPER->PRIOR_MODE`.
- [ ] E44 hard stops remain enforced while recovery is active (`exposure_blocked=true` when applicable).
- [ ] Recovery flow remains no-submit (`submitted=false`, `submitted_actions=0`).
- [ ] `verify:epoch56` passes x2 with identical fingerprints.
