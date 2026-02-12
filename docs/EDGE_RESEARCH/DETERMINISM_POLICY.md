# EDGE Determinism Policy (SSOT Law)

> This policy is normative (MUST/ MUST NOT), not advisory.
> Any conflict in epoch specs must be resolved in favor of this file, then synced back to specs.

## 1) Numeric and rounding law
- Numeric business fields MUST use decimal semantics only.
- Implicit JS `Number` floating behavior MUST NOT be relied upon for business rounding outcomes.
- Rounding mode is `truncate_toward_zero` for all deterministic material.

| Domain | Scale |
|---|---|
| price | 1e-8 |
| size / qty | 1e-8 |
| return / score / confidence | 1e-6 |
| bps | 1e-4 |
| leverage / weight | 1e-6 |

## 2) Serialization law
- Fingerprint serialization MUST be UTF-8, no BOM, compact JSON.
- Object keys MUST be recursively sorted lexicographically.
- Array order is semantic and MUST remain stable.
- `NaN`, `Infinity`, `-Infinity`, `undefined`, comments, trailing commas are forbidden.
- Decimal values MUST be rendered in fixed-point notation (no scientific notation).

## 3) Hash normalization law
- Algorithm: `sha256`.
- Bytes hashed: exact UTF-8 bytes of canonical JSON payload.
- Line endings for any text material included in hash MUST be normalized to LF (`\n`) before hashing.
- String normalization: trim is forbidden unless explicitly defined by contract; hash what contract defines.

## 4) Fingerprint include/exclude law
- Every contract MUST declare explicit include and exclude sets.
- Include set MUST include at least: `schema_version`, deterministic payload fields, parent references/hashes, `seed` (if present).
- Exclude set MUST include volatile metadata (`generated_at`, hostnames, PID, wall-clock durations) unless explicitly required.
- Include/exclude mismatches across docs/specs are a deterministic-policy violation.

## 5) Ordering law
- Record ordering keys MUST be explicit per contract and stable.
- Default key when applicable: `(symbol, timestamp, row_id)`.
- Timestamp monotonicity MUST hold within each partition key.
- Ties MUST be resolved by deterministic secondary keys; nondeterministic iteration order is forbidden.

## 6) Seed law
- Default seed is `12345` unless epoch spec explicitly overrides.
- Any stochastic path without explicit seed is forbidden.
- Seed propagation chain MUST be auditable (manifest/run config/evidence).

## 7) Determinism break-glass law
A determinism drift is any of:
- same inputs + same seed + same config produce different fingerprint;
- same ordered input records produce different output order;
- canonicalization differences alter hash with unchanged logical payload.

Required response:
1. Mark gate `FAIL`.
2. Mark epoch verdict `BLOCKED`.
3. Publish drift diagnostic in evidence (`*_DRIFT.md`).
4. Do not advance ledger status for affected epoch.

## 8) Offline invariant
- Default verify gates MUST run without network.
- Network-dependent checks are opt-in only via `ENABLE_NETWORK_TESTS=1`.
