# EDGE Determinism Policy (Canonical)

## 1) Decimal and rounding policy
- Internal math precision: decimal128-equivalent semantics; no binary float assertions in contracts.
- Canonical output scales:
  - `price`: 8 decimals, round half away from zero.
  - `qty`: 8 decimals, round half away from zero.
  - `notional`: 8 decimals.
  - `fee` and `pnl`: 8 decimals.
  - `bps` metrics: 4 decimals.
  - `ratio` metrics: 6 decimals.
- Round only at contract boundaries (serialization/output), not mid-pipeline.
- Negative zero must serialize as `0`.

## 2) Canonical JSON serialization policy
- Encoding: UTF-8, LF line endings.
- Object keys: lexicographic ascending.
- Arrays: preserve semantic order; never sort unless contract explicitly defines sorted order.
- Numbers: finite values only; `NaN`, `Infinity`, `-Infinity` are forbidden.
- Booleans/null: native JSON.
- Timestamps: ISO-8601 UTC with `Z` suffix.

## 3) Canonical hash policy
- Digest algorithm: `sha256` lowercase hex.
- File hashing:
  1. normalize path separator to `/`;
  2. strip leading `./`;
  3. normalize line endings to LF;
  4. hash byte content.
- JSON hashing: hash canonical JSON bytes only.
- Report bundle hashing: hash sorted list of `(normalized_path, file_sha256)` records.
- Forbidden hash inputs: wall-clock timestamps, hostnames, PID, random UUID without seeded generator.

## 4) Fingerprint specification
Fingerprint payload must include:
1. trade/intents list digest (ordered by contract order),
2. metrics set digest,
3. config digest,
4. dataset manifest digest,
5. schema version,
6. seed.

Fingerprint payload must exclude:
- runtime clocks,
- machine-specific paths,
- transient debug counters,
- network response headers.

## 5) Gate compatibility rule
Every epoch spec E31..E40 must reference this policy and define PASS/FAIL checks against these canonical rules.
