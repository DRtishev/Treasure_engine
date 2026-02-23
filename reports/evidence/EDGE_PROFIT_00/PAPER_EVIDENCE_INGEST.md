# PAPER_EVIDENCE_INGEST.md — EDGE_PROFIT_00

STATUS: BLOCKED
REASON_CODE: DC90
RUN_ID: 835061ba7062
NEXT_ACTION: npm run -s edge:profit:00

## Input

- input_kind: JSONL
- input_path: artifacts/incoming/paper_telemetry.jsonl
- rows_raw: 222
- rows_normalized: 222

## Outlier + Conflict Summary

- outlier_count: 5
- severe_conflict_count: 2

## Missing Required Fields

- NONE

## Outlier Marks (not deleted)

- row_12:value_outlier
- row_18:value_outlier
- row_27:conflict_SIG-0026|2026-02-20_10:25:00|ETHUSDT
- row_53:conflict_SIG-0051|2026-02-20_10:50:00|BTCUSDT
- row_6:value_outlier
