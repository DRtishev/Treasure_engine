# PAPER_EVIDENCE_INGEST.md — EDGE_PROFIT_00

STATUS: NEEDS_DATA
REASON_CODE: NDA02
RUN_ID: 1e640a385aaa
NEXT_ACTION: npm run -s edge:profit:00:sample

## Input

- input_kind: JSONL
- input_path: artifacts/incoming/paper_telemetry.jsonl
- rows_raw: 222
- rows_normalized: 220
- input_sha256: b5fe41e20929801270755c2436e3c051512f4815113c84452573d0cb1ba039d1

## Outlier + Conflict Summary

- outlier_count: 3
- severe_conflict_count: 0

## Missing Required Fields

- row_221:fee
- row_222:intended_exit

## Outlier Marks (not deleted)

- row_12:value_outlier
- row_18:value_outlier
- row_6:value_outlier
