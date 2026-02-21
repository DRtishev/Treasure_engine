# LEDGER_ACYCLICITY.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: c6ee3ba26d43
NEXT_ACTION: Acyclic contract satisfied. Ledger is idempotent across run order.

## Contract

The SHA256 ledger (edge:ledger) must never include its own outputs in scope.
Including SHA256SUMS.md or SHA256CHECK.md in their own hash calculation would:
1. Make SHA256SUMS.md non-idempotent (different hash each run depending on prior state)
2. Break ledger verification when run after edge:next-epoch

## Excluded Self-Outputs

- reports/evidence/EDGE_LAB/SHA256SUMS.md (EXCLUDED)
- reports/evidence/EDGE_LAB/SHA256CHECK.md (EXCLUDED)

## Files In Scope

110 files hashed in this run.

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/ledger_acyclicity.json
