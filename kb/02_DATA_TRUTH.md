# Data Truth

## Tier model
Train/validation/vault separation is enforced by epoch contracts and replay-safe manifests.

## Manifests and invariants
Use deterministic manifests and repository sanity via `npm run verify:manifest` and `npm run verify:repo`.

## Quality engine
Quality checks run offline first using `npm run verify:dataset` and evidence in `reports/evidence/`.
