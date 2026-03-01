# OKX_ORDERBOOK_DIGEST_SPEC.md

## PURPOSE

SSOT for the canonical orderbook digest used in all OKX orderbook regression gates
and alignment proofs. Any code computing or verifying the digest MUST comply with
this specification exactly.

---

## CANONICAL BOOK DIGEST

### Algorithm

```
digest = sha256(JSON.stringify({ asks: canonAsks, bids: canonBids }))
```

Where:

- `canonAsks` — array of `[price, size]` string tuples, sorted **ascending** by
  `compareDecimalStr(price)` (no `parseFloat`)
- `canonBids` — array of `[price, size]` string tuples, sorted **descending** by
  `compareDecimalStr(price)` (no `parseFloat`)

### Rules

1. **Input type**: price and size are strings (as received from the exchange).
2. **Zero exclusion**: entries where `size === "0"` are excluded from both sides.
3. **Sort key**: decimal string total order — `compareDecimalStr` from
   `scripts/edge/data_organ/decimal_sort.mjs`. No `parseFloat`, no floating-point
   arithmetic in the sort comparator.
4. **JSON structure**: exactly two keys in this order — `asks` first, then `bids`.
   No additional fields (`ts`, `update_id`, timestamps, etc.).
5. **Hash**: SHA-256 of the UTF-8 encoded JSON string (no trailing newline).

### Reference Implementation

```javascript
import { compareDecimalStr } from './data_organ/decimal_sort.mjs';
import crypto from 'node:crypto';

const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');

function canonicalize(bids, asks) {
  // bids: Map<price, size>  asks: Map<price, size>
  const canonBids = [...bids.entries()]
    .filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(b[0], a[0]))   // DESC
    .map(([p, s]) => [p, s]);
  const canonAsks = [...asks.entries()]
    .filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(a[0], b[0]))   // ASC
    .map(([p, s]) => [p, s]);
  const canonJson = JSON.stringify({ asks: canonAsks, bids: canonBids });
  return { digest: sha256(canonJson), canonJson };
}
```

---

## DECIMAL SORT TOTAL ORDER

Module: `scripts/edge/data_organ/decimal_sort.mjs`
Export: `compareDecimalStr(a, b)`

### Algorithm (no parseFloat)

1. **Sign**: negative < non-negative; two negatives compare inverse absolute value.
2. **Split** on `'.'`: integer part + optional fraction part.
3. **Integer length**: longer integer part (more digits) = larger (no leading zeros
   assumed from exchange prices).
4. **Integer lex**: if same length, lexicographic comparison.
5. **Fraction**: right-pad shorter fraction with `'0'`, then lexicographic comparison.

### Examples

| a | b | result |
|---|---|--------|
| `"9"` | `"10"` | `a < b` (length 1 < length 2) |
| `"50000"` | `"49999"` | `a > b` (lex: "5" > "4") |
| `"50000.00"` | `"50000"` | `a == b` (frac "00" == "" padded to "00") |
| `"1.9"` | `"1.10"` | `a > b` (frac "9" > "10" padded → "9" > "10" lex) |
| `"-5"` | `"-3"` | `a < b` (both neg: abs 5 > 3, so −5 < −3) |

---

## DEDUP POLICY

Key: `seqId` (from `data_capabilities.json`: `capabilities.okx.orderbook.dedup_key`)

- Maintain `Set<seqId>` of seen sequence IDs.
- If `seqId` already in set: **skip** the message (DEDUP event). No state mutation.
- If not seen: add to set and process normally.
- Guarantee: with or without duplicate messages, the final canonical digest is
  identical (idempotent).

---

## REORDER WINDOW POLICY

Capacity: `reorder_window_max_items` (from `data_capabilities.json`:
`capabilities.okx.orderbook.reorder_window_max_items`, currently `5`)

- Buffer incoming messages up to `N = reorder_window_max_items` items.
- When buffer reaches `N` (or at end of stream): sort buffer by `seqId` (integer
  ascending), then apply in sorted order.
- Guarantee: an out-of-order stream reordered within a window of size `N` produces
  the same canonical digest as the in-order stream.

---

## OKX 8-STEP ALIGN ALGORITHM

Reference: OKX WebSocket orderbook documentation, step 6 invariants.

State machine: `DISCARD → ALIGN_FIRST_EVENT → STRICT`

1. Discard all buffered messages where `seqId <= snapshot.seqId`.
2. First non-discarded message must satisfy:
   `prevSeqId <= snapshot.seqId < seqId` → `ALIGN_FIRST_EVENT` state.
3. Initialize book from REST snapshot (`bids` + `asks`).
4. Apply first buffered message → transition to `STRICT`.
5. Subsequent messages: require `prevSeqId === lastSeqId` (strict sequential).
6. Any violation = `ALIGN_GAP_FATAL` (exit code RDY02).

Implementation: `scripts/edge/edge_okx_orderbook_02_align_offline.mjs`

---

## GATE COVERAGE

| Gate ID | File | What it verifies |
|---------|------|-----------------|
| RG_DEC01_DECIMAL_SORT_TOTAL_ORDER | regression_dec01_decimal_sort_total_order.mjs | Total order properties of compareDecimalStr |
| RG_OB_OKX08_MULTI_LEVEL_SORT_CANON | regression_ob_okx08_multi_level_sort_canon.mjs | Multi-level sort + digest stability x2 |
| RG_OB_OKX09_DUPLICATE_IDEMPOTENT | regression_ob_okx09_duplicate_idempotent.mjs | Dedup by seqId — idempotent digest |
| RG_OB_OKX10_REORDER_WINDOW_POLICY | regression_ob_okx10_reorder_window_policy.mjs | Reorder window produces same digest as in-order |
| RG_OB_OKX12_ALIGN_INVARIANTS | regression_ob_okx12_align_invariants.mjs | OKX 8-step align invariants (fixture-based) |
| RG_OB_OKX13_BUFFER_DISCARD_RULES | regression_ob_okx13_buffer_discard_rules.mjs | Discard rule: seqId <= snapshot.seqId |
| RG_OB_OKX14_ALIGN_DETERMINISM_X2 | regression_ob_okx14_align_determinism_x2.mjs | Align engine byte-identical x2 |
| RG_OB_OKX15_DIGEST_SPEC_PRESENT | regression_ob_okx15_digest_spec_present.mjs | This spec file exists and has required sections |
| RG_OB_OKX16_DIGEST_MATCHES_SPEC | regression_ob_okx16_digest_matches_spec.mjs | Canonical digest impl matches spec algorithm |
| RG_CAP05_SCOPE_AWARE_LIMITS | regression_cap05_scope_aware_limits.mjs | capabilities.json has scopes + OKX dedup/reorder fields |

---

_Surface: OFFLINE_AUTHORITY — no network, no wallclock fields_
