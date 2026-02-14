# Verification Truth

## TruthStack
TruthStack = SSOT checks + implementation gates + evidence integrity.

## Phoenix and freeze
Freeze gates lock stability while allowing controlled epoch progression.

## Evidence and release doctrine
Release requires verifiable evidence, not narrative claims.

## Canonical pointers
- `scripts/verify/specs_check.mjs`
- `scripts/verify/release_check.mjs`
- `scripts/verify/ledger_check.mjs`
- `docs/EVIDENCE_PACK_SCHEMA.md`

## Operator checklist
- `npm run verify:specs`
- `npm run verify:repo`
- `RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release`

## Failure modes
- Gate order skipped, giving false-ready status.
- Evidence pack missing hashes or verdict file.
- CI-specific checks not reproduced locally.
