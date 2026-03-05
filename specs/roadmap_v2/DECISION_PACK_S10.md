# DECISION PACK — Sprint 10: Data Reality Packs

## Status: BLOCKED NEEDS_DATA
- `artifacts/incoming/ALLOW_NETWORK` absent
- Acquire scripts created as stubs (fail-closed offline)
- Lock schemas + validation gate implemented
- When ALLOW_NETWORK unlocked: operator runs acquire, locks land, gate passes

## Strategy

### A) Data Lock Schema
Lock files live in `artifacts/incoming/LOCKS/` as JSON:
```json
{
  "schema_version": "1.0.0",
  "lock_type": "fee_tiers|funding_rates|market_snapshot",
  "source": "binance|okx",
  "acquired_at": "ISO timestamp",
  "sha256": "hex hash of data payload",
  "params": { ... },
  "data": { ... }
}
```

### B) Calibration Contract
`artifacts/contracts/CALIBRATION_CONTRACT_v1.json` — frozen SHA of default cost model params.
When real data arrives, params update but contract tracks the change.

### C) Acquire Stubs (offline-safe)
- `scripts/acquire/acquire_fee_tiers.mjs` — BLOCKED without ALLOW_NETWORK
- `scripts/acquire/acquire_funding_rates.mjs` — BLOCKED without ALLOW_NETWORK
- `scripts/acquire/acquire_market_snapshot.mjs` — BLOCKED without ALLOW_NETWORK
Each exits 1 with reason NETWORK_FORBIDDEN if file absent.

### D) Gates
- verify:fast: `RG_DATA_LOCKS01` — schema validation, sha256 presence, no-network proof
- verify:deep: none needed (acquire is operator action, not pipeline)

### E) Calibration Receipt
`CALIBRATION_RECEIPT.md` — documents which cost model params are defaults vs data-backed

## NON-GOALS
- No actual API calls (offline)
- No new exchange adapters
- No changes to cost model computation logic

## ONE_NEXT_ACTION
Proceed to S11 Paper Burn-In
