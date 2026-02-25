# DATA_AUTHORITY_MODEL

STATUS: SSOT
NEXT_ACTION: npm run -s verify:public:data:readiness

## DEFINITIONS
- DATA READY requires lock+raw presence, lock/raw checksum parity, schema_version parity, and offline replay PASS under net-kill.
- FOUNDATION PASS is separate from data readiness.

## REASON CODES
- RDY01: required lock/raw missing.
- RDY02: hash/schema mismatch.
- RDY_NET01: offline replay failed.
- RDY_SCH01: provider config/schema contract missing.

## PROVIDER REGISTRY
- BYBIT_LIQ
  - lock: `artifacts/incoming/bybit_liq.lock.json`
  - raw: `artifacts/incoming/bybit_liq.raw.json`
  - schema_version: `liq.lock.v1`
