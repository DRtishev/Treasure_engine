# Recommended EDGE Stack

## Operator Summary
- Node-first stack is canonical for runtime and gates.
- Python is optional and research-only behind explicit feature flag.
- Offline-first dataset contracts are mandatory.
- All artifacts must be hash-addressable and immutable.
- Default gates must pass without internet.
- Deterministic serialization and rounding rules are non-optional.
- Registry/promotion requires evidence links and lock hashes.
- Shadow mode remains no-order by default.
- Runtime and lab paths must converge on identical contracts.
- Any stack change requires decision-matrix update.

## Where to look next
- AI controls: `docs/EDGE_RESEARCH/AI_MODULE.md`.
- Contract definitions: `docs/SDD_EDGE_EPOCHS_31_40.md`.

## Primary runtime (canonical)
- Node.js LTS + npm lockfile.
- JSON Schema + Ajv validation.
- Deterministic persistence via immutable manifests and optional SQLite.
- Evidence scripts writing to `reports/evidence/<EVIDENCE_EPOCH>/`.

## Optional lab mode
- `ENABLE_PYTHON_LAB=1` gates Python research tools.
- Python outputs must be exported to canonical JSON contracts.
- Runtime remains Node-first; no production dependency on Python lab.

## Offline dataset contract
Each snapshot requires:
1. `manifest.json` (snapshot id, schema version, source, row counts, timestamp range).
2. `sha256sum.txt` (all files checksummed).
3. `schema.json` (pinned shape).
4. `deps.lock` or equivalent environment hash.
5. `split_map.json` (train/validation/test boundaries and embargo metadata).

## Determinism doctrine
- Seed required for stochastic paths.
- Stable ordering by `(symbol, timestamp, row_id)`.
- Rounding policy: prices/sizes 1e-8, returns/scores 1e-6.
- Fingerprint policy: sha256 over canonical JSON + parent hashes + seed.

## Safety doctrine
- Network paths disabled unless `ENABLE_NETWORK_TESTS=1`.
- Live orders disabled by default; shadow asserts `orders_submitted==0`.
- Promotion requires deterministic replay + leakage controls + risk approval.
