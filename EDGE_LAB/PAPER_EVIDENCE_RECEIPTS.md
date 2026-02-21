# PAPER_EVIDENCE_RECEIPTS.md — Receipt Chain Rules
version: 1.0.0
last_updated: 2026-02-21
epoch: EPOCH_P0_PAPER_EVIDENCE_FOUNDATION

---

## Purpose

Defines how paper trading evidence is hashed, canonicalized, and locked against
post-hoc beautification or tampering. Every evidence file submitted to the
PAPER_EVIDENCE_COURT must carry a verifiable `evidence_hash` field.

---

## Receipt Hash Definition

```
evidence_hash = SHA256(canonical_trades_json)
```

Where `canonical_trades_json` is computed as:

1. **Sort** `trades[]` by `trade_id` (lexicographic ascending)
2. **Map** each trade to a fixed-key-order object:
   ```
   { trade_id, candidate, side, requested_qty, instrument,
     signal_ts, order_submit_ts, ack_ts, fills, bid_at_signal,
     ask_at_signal, context_volatility, result }
   ```
3. **Sort** each `fills[]` by `fill_ts` (lexicographic ascending)
4. **Map** each fill to a fixed-key-order object:
   ```
   { fill_ts, qty, price, fee_amount, fee_currency }
   ```
5. **Serialize**: `JSON.stringify(canonical_array)` — compact, no indent
6. **Hash**: `SHA256(utf8_bytes(serialized))` → 64-char lowercase hex

---

## Why Canonical Form?

JSON field order is not guaranteed by spec. Without a canonical form:
- Different generators produce different JSON for identical data
- Whitespace or key reordering could change the hash undetectably

The canonical form:
- **Fixes key order** (hardcoded in canonicalTradesJson function)
- **Sorts fills** (deterministic regardless of generation order)
- **Sorts trades** (deterministic regardless of generation order)
- **Compact serialization** (no whitespace variation)

This makes the hash **hard to accidentally invalidate** but **easy to
recompute** from any compliant implementation.

---

## Acyclicity Rule

The `evidence_hash` covers **only the `trades[]` array**.
It does NOT cover itself (no self-referential hash).
This ensures the hash is always computable before being embedded.

Ledger acyclicity: evidence_hash → trades only.
No trade references any other trade's hash.

---

## Tamper Detection

Any modification to the `trades[]` array (however minor) changes `evidence_hash`:

| Tamper Type | Detects? |
|-------------|---------|
| Change fill price | YES (E006) |
| Change fill qty | YES (E006) |
| Add/remove fill | YES (E006) |
| Change timestamp | YES (E006) |
| Change trade_id | YES (E006) |
| Change metadata (epoch_id, dates, notes) | NO — not covered |
| Change evidence_hash to wrong value | YES (E006) |

Metadata fields (epoch_id, start_date, etc.) are NOT covered by evidence_hash.
They are protected by the AJV schema constraints and separate business invariants.

---

## Receipt Chain (Optional Merkle Extension)

For MVP (EPOCH P0), a single flat hash over all trades is sufficient.
A future Merkle extension would allow:
- Per-trade leaf hashes
- Incremental verification
- Partial proof extraction

Upgrade path: when trade count exceeds 1000 or multi-instrument evidence
is needed, implement Merkle tree with sorted leaves.

---

## Generating a Valid Receipt

```bash
# Step 1: Produce trades JSON (your paper trading system)
# Step 2: Compute hash with reference implementation:
node --input-type=module <<'EOF'
import crypto from 'node:crypto';
import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync('artifacts/incoming/your_evidence.json', 'utf8'));
const sorted = [...data.trades].sort((a, b) => a.trade_id.localeCompare(b.trade_id));
const mapped = sorted.map(t => ({
  trade_id: t.trade_id, candidate: t.candidate, side: t.side,
  requested_qty: t.requested_qty, instrument: t.instrument,
  signal_ts: t.signal_ts, order_submit_ts: t.order_submit_ts, ack_ts: t.ack_ts,
  fills: [...t.fills].sort((a,b) => a.fill_ts.localeCompare(b.fill_ts)).map(f => ({
    fill_ts: f.fill_ts, qty: f.qty, price: f.price,
    fee_amount: f.fee_amount, fee_currency: f.fee_currency
  })),
  bid_at_signal: t.bid_at_signal, ask_at_signal: t.ask_at_signal,
  context_volatility: t.context_volatility, result: t.result
}));
console.log(crypto.createHash('sha256').update(JSON.stringify(mapped)).digest('hex'));
EOF
# Step 3: Set evidence_hash field to the output
# Step 4: Run validator: npm run edge:paper:evidence --file your_evidence.json
```

---

## Validation Command

```bash
npm run edge:paper:evidence
# → reads artifacts/incoming/paper_evidence.valid.json by default

npm run edge:paper:evidence -- --file artifacts/incoming/your_evidence.json
# → validates custom file
```

---

## Reason Codes for Receipt Failures

| Code | Trigger |
|------|---------|
| E006 | evidence_hash != SHA256(canonical trades) |
| E001 | evidence_hash field missing or wrong type/format |
| E020 | JSON is not parseable at all |

---

## Invariant: Ledger is Acyclic

- evidence_hash covers trades[] only (not itself)
- No trade references other trades
- No circular dependencies
- edge:ledger check verifies: sha256sums of evidence files do not reference themselves

SPEC: EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md
VALIDATOR: scripts/edge/edge_lab/edge_paper_evidence.mjs
