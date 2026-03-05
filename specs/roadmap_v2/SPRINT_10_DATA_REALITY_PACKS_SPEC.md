# Sprint 10: Data Reality Packs — SPEC

## Mission
Create acquire→lock→replay infrastructure so cost model can be calibrated from real exchange data. Offline by default (BLOCKED NEEDS_DATA without ALLOW_NETWORK).

## Invariants

| ID | Invariant | Gate |
|----|-----------|------|
| S10-D1 | Lock schema validated (schema_version, lock_type, sha256, data) | RG_DATA_LOCKS01 |
| S10-D2 | Acquire scripts fail-closed without ALLOW_NETWORK | RG_DATA_LOCKS01 |
| S10-D3 | Calibration contract tracks cost model param provenance | RG_DATA_LOCKS01 |
| S10-D4 | Default params documented in CALIBRATION_RECEIPT.md | RG_DATA_LOCKS01 |

## Gates

### verify:fast (+1)
- **RG_DATA_LOCKS01**: Validate lock schema if locks exist; verify acquire stubs fail-closed; verify calibration contract present

## Evidence
- `CALIBRATION_RECEIPT.md` — param provenance (default vs data-backed)
- Lock manifests under `artifacts/incoming/LOCKS/` (when data acquired)

## DoD
1. Lock schema and validation gate pass
2. Acquire stubs exit 1 without ALLOW_NETWORK
3. Calibration contract frozen
4. CALIBRATION_RECEIPT.md generated
