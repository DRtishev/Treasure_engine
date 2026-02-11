# Quality Bar

## Definition of Done (DoD)
A change is done only when:
- scoped target gates pass
- anti-flake reruns pass (where required)
- evidence pack exists with complete logs/manifests/summary
- export artifact checksum is recorded
- known limitations are explicitly documented

## Gate Standards
- Core baseline:
  - `npm run verify:e2`
  - `npm run verify:paper`
  - `npm run verify:e2:multi`
  - `npm run verify:phase2`
  - `npm run verify:integration`
- Aggregate:
  - `npm run verify:core`

## Code Quality Rules
- Minimal diff first.
- Preserve backward compatibility for existing scripts where feasible.
- No pass/fail claims without file-backed evidence.
- Deterministic, run-scoped artifacts in verification paths.

## Documentation Quality
- Every epoch spec must include Patch/Gate/Evidence plans.
- Every new gate must define expected output path and failure signal.

## Specs Quality Check (validated in this refresh)
- SSOT authority hierarchy documented.
- Constraints and anti-flake policy documented.
- EPOCH-17..21 specs include required template sections.
- Dependency ordering documented in `specs/epochs/README.md`.
