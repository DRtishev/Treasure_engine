# Data Truth

## Tier model
Data tiers distinguish reproducible local fixtures from optional network-fed sources.

## Manifests and invariants
Manifest, checksums, and schema checks prevent silent corruption.

## Quality engine
Deterministic quality checks must fail on contract breaches.

## Canonical pointers
- `core/data/dataset_tier_policy.mjs`
- `core/data/dataset_io.mjs`
- `scripts/verify/dataset_check.mjs`
- `specs/CONSTRAINTS.md`

## Operator checklist
- `npm run verify:dataset`
- `npm run verify:offline`
- `npm run verify:repo`

## Failure modes
- Mixed tier usage introduces hidden online dependency.
- Manifest hashes stale after manual edits.
- Dataset checks pass once but fail under CI due to nondeterminism.
