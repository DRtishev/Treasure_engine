# PAPER_EVIDENCE_SCHEMA_V1.md — Trade-Level Paper Evidence Contract
version: 1.0.0
last_updated: 2026-02-21
epoch: EPOCH_P0_PAPER_EVIDENCE_FOUNDATION
machine_schema: scripts/edge/edge_lab/paper_evidence_schema_v1.json
validator: scripts/edge/edge_lab/edge_paper_evidence.mjs
gate_output: reports/evidence/EDGE_LAB/PAPER_EVIDENCE_COURT.md

---

## Purpose

Formal contract for trade-level paper trading evidence. Replaces summary-only
paper evidence with a hard-to-beautify, anti-tamper receipt chain.

When this file is present and all 26 invariants pass: PAPER_EVIDENCE_COURT → PASS.
When absent: PAPER_EVIDENCE_COURT → NEEDS_DATA (E900).
When tampered: PAPER_EVIDENCE_COURT → FAIL (E006).
When invariant violated: PAPER_EVIDENCE_COURT → FAIL (E001–E025).

---

## File Path

`artifacts/incoming/paper_evidence.valid.json`

---

## Required Top-Level Fields

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| schema_version | string | const "1.0.0" | Bump on schema changes |
| epoch_id | string | PAPER_EPOCH_[A-Z0-9_]+ | Unique per epoch |
| start_date | string | YYYY-MM-DD | Epoch start |
| end_date | string | YYYY-MM-DD | >= start_date |
| instrument | string | enum BTCUSDT/ETHUSDT/SOLUSDT | Primary instrument |
| venue | string | enum BINANCE_TESTNET/BINANCE_PAPER/OKX_PAPER | Execution venue |
| evidence_hash | string | 64-char hex SHA256 | Anti-tamper: SHA256 of canonical trades JSON |
| rounding_policy | object | see below | Fill qty rounding rules |
| venue_fee_policy | object | see below | Fee validation parameters |
| trades | array | minItems 1 | Trade-level evidence records |
| total_trades | integer | >= 1, == trades.length | Declared total (verified) |
| generated_at | string | ISO 8601 Z | Generator timestamp |
| notes | string | optional | Free-text |

---

## Rounding Policy Fields

| Field | Type | Constraint |
|-------|------|-----------|
| max_fill_qty_drift_pct | number | 0 < x <= 0.01 |
| description | string | minLength 5 |

---

## Venue Fee Policy Fields

| Field | Type | Constraint |
|-------|------|-----------|
| min_fee_rate | number | 0 < x <= 0.01 |
| fee_currencies | array of string | enum USDT/BNB/ETH |
| description | string | minLength 5 |

---

## Per-Trade Required Fields

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| trade_id | string | [A-Z0-9_]+, minLength 3 | Globally unique |
| candidate | string | H_[A-Z_]+ | From PROFIT_CANDIDATES_V1.md |
| side | string | BUY or SELL | Required |
| requested_qty | number | > 0 | Quantity submitted to venue |
| instrument | string | enum | BTCUSDT/ETHUSDT/SOLUSDT |
| signal_ts | string | ISO 8601 Z, ms precision | Signal generation time |
| order_submit_ts | string | ISO 8601 Z, ms precision | Order sent time |
| ack_ts | string | ISO 8601 Z, ms precision | Exchange acknowledgment time |
| fills | array | minItems 1 | Fill records |
| bid_at_signal | number | > 0 | Best bid at signal time |
| ask_at_signal | number | > 0 | Best ask at signal time |
| context_volatility | string | LOW/MEDIUM/HIGH/VOLATILE | Market context label |
| result | string | WIN/LOSS/BREAKEVEN | Trade outcome |

---

## Per-Fill Required Fields

| Field | Type | Constraint |
|-------|------|-----------|
| fill_ts | string | ISO 8601 Z, ms precision |
| qty | number | > 0 |
| price | number | > 0 |
| fee_amount | number | >= 0 |
| fee_currency | string | enum USDT/BNB/ETH |

---

## Invariants (26 enforced by edge_paper_evidence.mjs)

| # | Code | Invariant |
|---|------|-----------|
| 1 | E900 | File exists (NEEDS_DATA if absent, not FAIL) |
| 2 | E020 | JSON parseable |
| 3 | E021 | schema_version == "1.0.0" |
| 4 | E001 | AJV schema validation (all required fields, types, enums) |
| 5 | E006 | evidence_hash == SHA256(canonical trades JSON) — anti-tamper |
| 6 | E019 | start_date <= end_date |
| 7 | E018 | total_trades == trades.length |
| 8 | E014 | No duplicate trade_ids |
| 9 | E002 | signal_ts < order_submit_ts (monotonic) |
| 10 | E011 | order_submit_ts − signal_ts >= 1ms (zero-latency detection) |
| 11 | E002 | order_submit_ts < ack_ts (monotonic) |
| 12 | E016 | ack_ts <= first fill_ts |
| 13 | E017 | fills ordered monotonically by fill_ts |
| 14 | E023 | all fill_ts > signal_ts |
| 15 | E003 | sum(fill.qty) == requested_qty within rounding_policy.max_fill_qty_drift_pct |
| 16 | E024 | all fill qty > 0 |
| 17 | E025 | fee_amount >= 0 for all fills |
| 18 | E005 | fee_amount >= venue_fee_policy.min_fee_rate * qty * price |
| 19 | E022 | fee_currency in venue_fee_policy.fee_currencies |
| 20 | E007 | bid_at_signal > 0 |
| 21 | E007 | ask_at_signal > 0 |
| 22 | E008 | bid_at_signal < ask_at_signal (no inverted market) |
| 23 | E010 | spread >= 0.001% of mid (zero-spread detection) |
| 24 | E013 | fill price within bid*0.995 .. ask*1.005 |
| 25 | E009 | VOLATILE context: no perfect-fill signature (fill_ts−ack_ts < 5ms + price at mid) |
| 26 | E012 | VOLATILE + requested_qty > 0.01: requires partial fills (fills.length > 1) |

---

## Anti-Tamper Hash

`evidence_hash` = SHA256 of the canonical JSON of the `trades` array:

1. Sort trades by `trade_id` (lexicographic)
2. For each trade, extract fields in fixed order:
   `trade_id, candidate, side, requested_qty, instrument, signal_ts,
    order_submit_ts, ack_ts, fills, bid_at_signal, ask_at_signal,
    context_volatility, result`
3. For each fill in `fills`, sort by `fill_ts`, extract fields in fixed order:
   `fill_ts, qty, price, fee_amount, fee_currency`
4. `JSON.stringify(canonical_array)` (no indent, compact)
5. `SHA256(utf8_bytes)` → 64-char hex

This hash is **recomputed at validation time** and compared against the declared
`evidence_hash`. Any modification to trade data changes the hash → E006 FAIL.

---

## Reason Code Taxonomy (E***)

| Code | Name | Gate Status |
|------|------|-------------|
| E001 | SCHEMA_VALIDATION_FAILED | FAIL |
| E002 | TIMESTAMP_NOT_MONOTONIC | FAIL |
| E003 | FILL_SIZE_MISMATCH | FAIL |
| E004 | FEE_FIELD_MISSING | FAIL |
| E005 | FEE_BELOW_VENUE_MINIMUM | FAIL |
| E006 | RECEIPT_HASH_MISMATCH | FAIL |
| E007 | BID_ASK_MISSING | FAIL |
| E008 | BID_ASK_INVERTED | FAIL |
| E009 | PERFECT_FILL_DETECTED | FAIL |
| E010 | SPREAD_TOO_TINY | FAIL |
| E011 | ZERO_LATENCY | FAIL |
| E012 | NO_PARTIALS_VOLATILE | FAIL |
| E013 | FILL_PRICE_OUTSIDE_RANGE | FAIL |
| E014 | DUPLICATE_TRADE_ID | FAIL |
| E015 | CANDIDATE_PATTERN_INVALID | FAIL |
| E016 | FILL_BEFORE_ACK | FAIL |
| E017 | FILLS_NOT_MONOTONIC | FAIL |
| E018 | TOTAL_TRADES_MISMATCH | FAIL |
| E019 | EPOCH_DATE_ORDER_INVALID | FAIL |
| E020 | JSON_PARSE_ERROR | FAIL |
| E021 | SCHEMA_VERSION_INVALID | FAIL |
| E022 | FEE_CURRENCY_INVALID | FAIL |
| E023 | FILL_BEFORE_SIGNAL | FAIL |
| E024 | ZERO_FILL_QTY | FAIL |
| E025 | NEGATIVE_FEE | FAIL |
| E900 | PAPER_EVIDENCE_MISSING | NEEDS_DATA |

---

## Status Semantics

| Condition | STATUS |
|-----------|--------|
| File absent | NEEDS_DATA (E900) |
| JSON parse error | FAIL (E020) |
| Schema version mismatch | FAIL (E021) |
| AJV schema violation | FAIL (E001) |
| Hash mismatch (tamper) | FAIL (E006) |
| Any business invariant violation | FAIL (E002–E025) |
| All invariants satisfied | PASS |

---

## Fixtures

| File | Expected Result | Reason Code |
|------|----------------|-------------|
| artifacts/incoming/paper_evidence.valid.json | PASS | NONE |
| artifacts/incoming/paper_evidence.fail_E001.json | FAIL | E001 |
| artifacts/incoming/paper_evidence.tamper_E006.json | FAIL | E006 |

---

## MCL Notes

FRAME: Trade-level paper evidence with anti-tamper hash chain.
RISKS: Fabricated timestamps or perfect-fill hallucinations.
MITIGATIONS: Monotonic timestamp checks, zero-latency detection, spread detection, hash lock.
CONTRACT: edge_paper_evidence.mjs enforces all invariants. Fail-closed.
MIN-DIFF: New court only; existing edge_paper_ingest.mjs untouched.
RED-TEAM: Modify fill price → E006 (hash changes). Remove fills → E001. Zero spread → E010.
