# PAPER_EVIDENCE_FIXTURES_REPORT.md — Fixture Verification Report
version: 1.0.0
last_updated: 2026-02-21
epoch: EPOCH_P0_PAPER_EVIDENCE_FOUNDATION
validator: scripts/edge/edge_lab/edge_paper_evidence.mjs

---

## Purpose

Proves that each fixture hits its expected reason code, confirming:
1. The validator correctly passes valid evidence (PASS)
2. The validator correctly fails schema violations (E001)
3. The validator correctly catches tamper attempts (E006)

---

## Fixture Summary

| Fixture File | Expected Status | Expected Code | Actual Status | Actual Code | PASS/FAIL |
|-------------|----------------|---------------|---------------|-------------|-----------|
| paper_evidence.valid.json | PASS | NONE | PASS | NONE | PASS |
| paper_evidence.fail_E001.json | FAIL | E001 | FAIL | E001 | PASS |
| paper_evidence.tamper_E006.json | FAIL | E006 | FAIL | E006 | PASS |

All 3 fixtures hit expected outcomes. Validator is correct.

---

## Fixture Details

### 1. paper_evidence.valid.json — Expected: PASS

**What it proves**: All 26 invariants satisfied simultaneously.

Characteristics:
- 4 candidates: H_ATR_SQUEEZE_BREAKOUT, H_BB_SQUEEZE, H_VOLUME_SPIKE, H_VWAP_REVERSAL
- 8 trades per candidate = 32 total (exceeds 30-trade minimum for P1)
- Timestamps: monotonic, non-zero latency (39–63ms submit lag, 62–94ms ack lag)
- Fills: mostly single, T_ATRSQ_004 has 2 partial fills summing to 0.001
- Fees: USDT, ~0.1% of notional (well above 0.01% venue minimum)
- Bid/ask: realistic 5.5–11 USDT spread (~0.006%–0.011% of mid)
- Context: LOW/MEDIUM/HIGH (no VOLATILE to simplify fixture; VOLATILE tests in unit tests)
- evidence_hash: SHA256(canonical trades) = eba2a8bb...738d0e45 ✓

Verification command:
```bash
node scripts/edge/edge_lab/edge_paper_evidence.mjs \
  --file artifacts/incoming/paper_evidence.valid.json
# Expected: [PASS] edge:paper:evidence — PAPER_EPOCH_20260102_20260131_V1: 32 trades, hash verified
```

Invariants covered:
- E900: file exists ✓
- E020: valid JSON ✓
- E021: schema_version == "1.0.0" ✓
- E001: AJV schema passes ✓
- E006: evidence_hash matches computed ✓
- E019: start_date <= end_date ✓
- E018: total_trades == 32 == trades.length ✓
- E014: all 32 trade_ids unique ✓
- E002/E011: timestamps monotonic, latency >= 1ms ✓
- E016: ack <= first fill ✓
- E017: fills ordered ✓
- E023: all fills after signal ✓
- E003: fill qty sums match requested ✓
- E024: all fill qty > 0 ✓
- E025/E005/E022: fees valid ✓
- E007/E008/E010: bid/ask valid, spread >= 0.001% ✓
- E013: fill prices within bid±0.5%..ask±0.5% ✓
- E009/E012: no VOLATILE context → perfect fill check not triggered ✓

---

### 2. paper_evidence.fail_E001.json — Expected: FAIL (E001)

**What it proves**: Missing `side` field is caught at AJV schema validation (before hash check).

Design:
- 1 trade (T_FAIL_001) missing the required `side` field
- evidence_hash is a zero-placeholder (irrelevant; E001 fires first)
- total_trades: 1 (matches trades.length)

Failure path:
```
Step 4 (AJV): /trades/0 must have required property 'side' → E001 → exit 1
```

Verification command:
```bash
node scripts/edge/edge_lab/edge_paper_evidence.mjs \
  --file artifacts/incoming/paper_evidence.fail_E001.json
# Expected: [FAIL] edge:paper:evidence — E001: SCHEMA_VALIDATION_FAILED: /trades/0 must have required property 'side'
# Expected exit code: 1
```

---

### 3. paper_evidence.tamper_E006.json — Expected: FAIL (E006)

**What it proves**: Modifying any bit of the evidence_hash breaks the receipt verification.

Design:
- 1 trade (T_ATRSQ_001) with valid structure
- evidence_hash = `0ba2a8bb...` (first nibble changed from `e` to `0`)
- Computed hash of the 1-trade array ≠ declared hash → E006

Tamper: first hex digit changed: `e` → `0`

Failure path:
```
Step 5 (hash check): declared=0ba2a8bb… != computed=<actual> → E006 → exit 1
```

Note: The computed hash covers only trades[], so changing `total_trades`,
`notes`, or `epoch_id` would NOT trigger E006 — those are protected by AJV
schema constraints and business invariants (E018, E019, etc.).

Verification command:
```bash
node scripts/edge/edge_lab/edge_paper_evidence.mjs \
  --file artifacts/incoming/paper_evidence.tamper_E006.json
# Expected: [FAIL] edge:paper:evidence — E006: RECEIPT_HASH_MISMATCH: declared=0ba2a8bbe949a5cd… — TAMPER DETECTED
# Expected exit code: 1
```

---

## Regression Test Commands

```bash
# Run all three fixtures and verify exit codes:
node scripts/edge/edge_lab/edge_paper_evidence.mjs \
  --file artifacts/incoming/paper_evidence.valid.json && echo "FIXTURE_VALID: PASS"

node scripts/edge/edge_lab/edge_paper_evidence.mjs \
  --file artifacts/incoming/paper_evidence.fail_E001.json 2>&1 | \
  grep -q "E001" && echo "FIXTURE_FAIL_E001: PASS"

node scripts/edge/edge_lab/edge_paper_evidence.mjs \
  --file artifacts/incoming/paper_evidence.tamper_E006.json 2>&1 | \
  grep -q "E006" && echo "FIXTURE_TAMPER_E006: PASS"
```

---

## Anti-Tamper Strength Assessment

| Technique | Effectiveness |
|-----------|--------------|
| Change fill price | DETECTED (E006) |
| Change fill qty | DETECTED (E006) |
| Add a trade | DETECTED (E006) + E018 |
| Remove a trade | DETECTED (E006) + E018 |
| Change timestamp | DETECTED (E006) |
| Beautify JSON | NOT DETECTED — canonical hash only (by design) |
| Change schema_version | DETECTED (E021) |
| Remove required field | DETECTED (E001) |
| Zero spread | DETECTED (E010) |
| Zero latency | DETECTED (E011) |
| Perfect fill in VOLATILE | DETECTED (E009) |

SPEC: EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md
RECEIPTS: EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md
