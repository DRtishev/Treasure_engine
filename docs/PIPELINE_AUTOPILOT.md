# PIPELINE AUTOPILOT

## 1) Run-dir discipline
All variable run outputs must be scoped to:
`reports/runs/<gate>/<seed>/<repeat>/<run_id>/`
No repeat run may overwrite prior artifacts.

## 2) Multi-seed stability policy
- `verify:e2:multi` is mandatory.
- `verify:paper:multi` is mandatory.
- At least 3 seeds are validated, and one seed is repeated twice for anti-drift fingerprints.

## 3) Anti-flake repeats
Critical baseline checks:
- `verify:paper` x2
- `verify:e2` x2
- plus multi-seed gates for both e2 and paper.

## 4) Evidence pack structure
For each epoch, keep `reports/evidence/<EPOCH-ID>/` with:
- PREFLIGHT, SNAPSHOT, ASSUMPTIONS, GATE_PLAN, RISK_REGISTER
- `gates/*.log`
- `DIFF.patch`
- checksum manifests (`SHA256SUMS.*`)
- SUMMARY + VERDICT

## 5) SAFE / BLOCKED protocol
- SAFE only when required gates pass and evidence manifests validate.
- BLOCKED when any required gate/checksum/evidence item is missing or failing.

## 6) Autonomous epoch advancement
- `epoch:next` prints the next READY epoch from ledger + dependency reasoning.
- `epoch:run` executes required verify gates for the next READY epoch and writes logs.
- `epoch:close` validates evidence completeness then marks epoch DONE in ledger.


## Epoch executor commands
- `npm run epoch:next`
- `npm run epoch:run`
- `npm run epoch:close`
- Honors `EVIDENCE_EPOCH` for run/evidence location.
