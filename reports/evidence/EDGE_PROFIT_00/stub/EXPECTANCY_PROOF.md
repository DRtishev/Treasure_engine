# EXPECTANCY_PROOF.md

STATUS: NEEDS_DATA
REASON_CODE: EP02_REAL_REQUIRED
RUN_ID: a0e3806a2bb8
NEXT_ACTION: npm run -s edge:profit:00:import:csv

## Inputs

- ingest_status: PASS
- execution_reality_status: PASS
- expectancy_status: PASS
- evidence_source: FIXTURE_STUB

## Threshold checks

- ci95_low: 0.28001992 (require > 0)
- psr0: 1 (require >= 0.95)
- min_trl_trades: 3.6 (require >= 2)
- trades_n: 360 (require >= 200)
