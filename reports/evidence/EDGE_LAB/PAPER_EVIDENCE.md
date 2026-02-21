# PAPER_EVIDENCE.md — Paper Trading Evidence Court
generated_at: 413510c72bed
script: edge_paper_ingest.mjs

## STATUS: PASS

## Epoch Summary

| Field | Value |
|-------|-------|
| epoch_id | PAPER_EPOCH_20260102_20260131 |
| start_date | 2026-01-02 |
| end_date | 2026-01-31 |
| instrument | BTCUSDT |
| total_trades | 140 |
| schema_version | 1.0.0 |

## Candidate Performance (MEASURED)

| Candidate | Trades | Expectancy | Win Rate | Sharpe | Max DD |
|-----------|--------|-----------|---------|--------|--------|
| H_ATR_SQUEEZE_BREAKOUT | 35 | 0.620% | 57.1% | 0.57 | 1.21% |
| H_BB_SQUEEZE | 35 | 0.607% | 57.1% | 0.56 | 1.23% |
| H_VOLUME_SPIKE | 35 | 0.565% | 57.1% | 0.55 | 1.19% |
| H_VWAP_REVERSAL | 35 | 0.548% | 57.1% | 0.61 | 0.91% |

## Verdict

STATUS=PASS: Paper evidence schema valid, trade counts sufficient (>= 30 per candidate).
MEASURED status will be applied to EXECUTION_REALITY_COURT on next run.
NEXT_ACTION: Rerun edge:all or edge:execution:reality to apply MEASURED expectancy values.

## Spec

EDGE_LAB/PAPER_EVIDENCE_SPEC.md — version 1.0.0
