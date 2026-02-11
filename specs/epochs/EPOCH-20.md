# EPOCH-20 — Monitoring and Performance Gates

## REALITY SNAPSHOT
- This epoch is part of the dependency chain defined in `specs/epochs/INDEX.md` and must preserve offline-first baseline gates.
- Existing run artifacts and deterministic wrappers already use `reports/runs/<gate>/<seed>/<repeat>/<run_id>/`.
- Evidence target for this epoch is `reports/evidence/EPOCH-20/`.

## GOALS
- Deliver the epoch contract through deterministic, reproducible gates.
- Keep regression baseline (`verify:paper`, `verify:e2`, `verify:e2:multi`) green.
- Produce complete evidence and manifest validation before SAFE verdict.

## NON-GOALS
- No unscoped product feature invention.
- No default-on network verification path.
- No live-production execution by default.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Deterministic seeds and run-scoped output directories are mandatory.
- No secrets in specs, logs, manifests, or artifacts.

## DESIGN / CONTRACTS
- Primary contracts: `truth/monitoring_report.schema.json`, `scripts/verify/monitoring_perf_check.mjs`, telemetry outputs in `reports/monitoring_report.json`.
- Inputs: SSOT files (`spec/ssot.json`, `spec/hacks.json`), gate scripts, local fixtures.
- Outputs: gate logs in `reports/evidence/EPOCH-20/gates/` and run artifacts in `reports/runs/...`.
- Environment variables: `SEED` (default `12345`), `ENABLE_NETWORK_TESTS` (required for network-only checks), `RELEASE_UNLOCK` for governed release actions.
- Schemas and report contracts must remain valid against `truth/*.schema.json` where applicable.

## PATCH PLAN
1. Implement only contract-relevant files:
  - `truth/monitoring_report.schema.json`
  - `scripts/verify/monitoring_perf_check.mjs`
2. Keep a minimal diff and avoid non-functional churn.
3. Preserve backward compatibility of npm gate names.

## VERIFY
- Required command order:
- `npm run verify:epoch20`
- `npm run verify:epoch20`
- `npm run verify:specs`
- `npm run verify:paper`
- `npm run verify:e2`
- `npm run verify:e2:multi`
- `npm run verify:monitoring`
- `npm run verify:core`
- Expected artifacts:
  - run-scoped outputs under `reports/runs/<gate>/<seed>/<repeat>/<run_id>/`
  - gate logs under `reports/evidence/EPOCH-20/gates/`
- Anti-flake policy: run epoch gate twice and baseline critical gates as defined by wall.

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-20/PREFLIGHT.log`
- `reports/evidence/EPOCH-20/SNAPSHOT.md`
- `reports/evidence/EPOCH-20/ASSUMPTIONS.md`
- `reports/evidence/EPOCH-20/GATE_PLAN.md`
- `reports/evidence/EPOCH-20/RISK_REGISTER.md`
- `reports/evidence/EPOCH-20/DIFF.patch`
- `reports/evidence/EPOCH-20/gates/*.log`
- `reports/evidence/EPOCH-20/SHA256SUMS.SOURCE.txt`
- `reports/evidence/EPOCH-20/SHA256SUMS.EVIDENCE.txt`
- `reports/evidence/EPOCH-20/SUMMARY.md`
- `reports/evidence/EPOCH-20/VERDICT.md`

## STOP RULES
- PASS only if required gates pass, anti-flake repeats are complete, and manifests validate.
- BLOCKED if any required gate fails, outputs are non-deterministic, or evidence is incomplete.
- Trigger rollback if baseline gate regressions appear after epoch changes.

## RISK REGISTER
- Technical risk: contract mismatch between gate script and runtime module interfaces.
- Operational risk: stale or overwritten run artifacts masking failures.
- Meta-risk: false PASS due to missing evidence files or unchecked manifests.
- Rollback risk: partial revert leaving gate map and epoch docs out of sync.

## ACCEPTANCE CRITERIA
- [ ] Epoch gate is implemented and mapped in `package.json`.
- [ ] `npm run verify:specs` passes after spec updates.
- [ ] Epoch-specific gate passes twice (anti-flake).
- [ ] Baseline safety gates remain green (`verify:paper`, `verify:e2`, `verify:e2:multi`).
- [ ] Evidence folder is complete and checksum manifests validate.

## NOTES
- Compatibility: preserve existing script names consumed by automation and runbooks.
- Rollback plan: revert epoch-scoped commits, rerun `npm run verify:specs`, then rerun `npm run verify:core` and epoch gate.
