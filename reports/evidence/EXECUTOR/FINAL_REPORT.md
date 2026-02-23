# FINAL_REPORT.md

## SNAPSHOT
- CALM x2 determinism: PASS.
- INFRA P0: FAIL (NT02 runtime node family mismatch under Node 20).
- GOV integrity: BLOCKED (depends on P0_SYSTEM_PASS).

## FINDINGS
- Acyclic checksum/merkle scope applied and aligned across CHECKSUMS, MERKLE, GOV01.
- DEP02 optional-native path enforced fail-closed via omit-optional + feature flag OFF contract.

## RISKS
- Runtime environment still on Node 20; NODE_TRUTH requires Node 22 family.

## CHANGES
- Clean-room purge before CALM hash/receipt pipeline.
- Excluded derived artifacts from hash scope.
- Added relpath-level drift diagnostics for ND01.
- Added gov_integrity.json output alias.
- Moved better-sqlite3 to optionalDependencies and updated DEP policy/gate semantics.

## EVIDENCE (SSOT)
- reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json
- reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json
- reports/evidence/GOV/gates/manual/gov_integrity.json
- reports/evidence/GOV/gates/manual/edge_unlock.json

## VERDICT
BLOCKED

## NEXT_ACTION
nvm use 22.22.0
