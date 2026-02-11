# SSOT INDEX

## Canonical Single Sources of Truth
- `spec/ssot.json` — canonical strategy/system baseline parameters.
- `spec/hacks.json` — allowed hack registry controlled by validation gate.
- `spec/config.schema.json` — runtime configuration contract.
- `truth/*.schema.json` — verification schemas for reports and event artifacts.
- `specs/CONSTRAINTS.md` — global engineering and QA constraints.
- `specs/epochs/INDEX.md` + `specs/epochs/EPOCH-*.md` — implementation order and epoch contracts.

## Change Control Rules
1. Propose SSOT changes in the relevant epoch spec first.
2. Keep one semantic change per commit (atomic discipline).
3. Any change to `spec/*.json` or `truth/*.schema.json` must be accompanied by gate evidence:
   - validation command output,
   - updated evidence summary,
   - checksum manifest refresh.
4. Network-dependent validation remains opt-in with `ENABLE_NETWORK_TESTS=1`; default verify path must stay offline.
5. Determinism-sensitive SSOT changes require repeat runs and multi-seed checks.

## Validation Workflow
- Baseline:
  - `npm run verify:specs`
  - `npm run verify:core`
  - `npm run verify:phase2`
  - `npm run verify:integration`
- Release integrity:
  - `npm run verify:release-governor`
  - `node scripts/ops/regen_manifests.mjs`

## Evidence Requirements for SSOT Changes
Store under `reports/evidence/<EPOCH-ID>/`:
- gate logs (`gates/*.log`),
- `DIFF.patch`,
- `SHA256SUMS.SOURCE.txt`, `SHA256SUMS.EVIDENCE.txt`, and `SHA256SUMS.EXPORT.txt` (when export exists),
- `SUMMARY.md` and `VERDICT.md`.
