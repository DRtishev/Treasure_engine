# PAPER_EVIDENCE_COURT.md — EPOCH P0 Paper Evidence Court
generated_at: 3444ae7de207
script: edge_paper_evidence.mjs
schema: paper_evidence_schema_v1.json
input: artifacts/incoming/paper_evidence.valid.json

## STATUS: PASS

## Reason Code
NONE

## Candidate Summary (MEASURED)

| Candidate | Trades | Win Rate |
|-----------|--------|---------|
| H_ATR_SQUEEZE_BREAKOUT | 8 | 75.0% |
| H_BB_SQUEEZE | 8 | 75.0% |
| H_VOLUME_SPIKE | 8 | 75.0% |
| H_VWAP_REVERSAL | 8 | 75.0% |

## Epoch

| Field | Value |
|-------|-------|
| epoch_id | PAPER_EPOCH_20260102_20260131_V1 |
| start_date | 2026-01-02 |
| end_date | 2026-01-31 |
| instrument | BTCUSDT |
| venue | BINANCE_TESTNET |
| total_trades | 32 |
| schema_version | 1.0.0 |
| evidence_hash (verified) | `eba2a8bbe949a5cd735ba7774ea691f9cee9ee9fb41af2ec5c0b17e6738d0e45` |

## Invariants Checked (25+)

| # | Code | Invariant |
|---|------|-----------|
| 1 | E900 | File exists |
| 2 | E020 | JSON parseable |
| 3 | E021 | schema_version == "1.0.0" |
| 4 | E001 | AJV schema validation (structural) |
| 5 | E006 | evidence_hash == SHA256(canonical trades) — anti-tamper |
| 6 | E019 | start_date <= end_date |
| 7 | E018 | total_trades == trades.length |
| 8 | E014 | No duplicate trade_ids |
| 9 | E002 | signal_ts < order_submit_ts (monotonic) |
| 10 | E011 | order_submit_ts - signal_ts >= 1ms (no zero latency) |
| 11 | E002 | order_submit_ts < ack_ts (monotonic) |
| 12 | E016 | ack_ts <= first fill_ts |
| 13 | E017 | fills ordered monotonically by fill_ts |
| 14 | E023 | all fill_ts > signal_ts |
| 15 | E003 | sum(fill.qty) == requested_qty within rounding_policy |
| 16 | E024 | all fill qty > 0 |
| 17 | E025 | fee_amount >= 0 for all fills |
| 18 | E005 | fee_amount >= venue_fee_policy.min_fee_rate * qty * price |
| 19 | E022 | fee_currency in venue_fee_policy.fee_currencies |
| 20 | E007 | bid_at_signal > 0 |
| 21 | E007 | ask_at_signal > 0 |
| 22 | E008 | bid_at_signal < ask_at_signal |
| 23 | E010 | spread >= 0.001% of mid price (zero-spread detection) |
| 24 | E013 | fill price within bid*0.995 .. ask*1.005 |
| 25 | E009 | VOLATILE context: no perfect-fill signature |
| 26 | E012 | VOLATILE + qty > 0.01: partials required |

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/PAPER_EVIDENCE_COURT.md
- reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json

NEXT_ACTION: Proceed to EPOCH P1 (EXPECTANCY_CI_COURT).

## Spec

EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md — version 1.0.0
EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md — hash chain rules
