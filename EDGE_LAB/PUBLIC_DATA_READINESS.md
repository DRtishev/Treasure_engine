# PUBLIC_DATA_READINESS.md

STATUS: ACTIVE

Gate SSOT: `npm run -s verify:public:data:readiness`

STATUS semantics:
- PASS: required lock artifacts exist, integrity validates, offline replay smoke passes per claimed route.
- NEEDS_DATA: required lock artifacts missing/stale.
- FAIL: lock/schema/hash mismatch or offline replay violates net-kill contract.

Required readiness artifacts:
- artifacts/incoming/bybit_liq.lock.json
- artifacts/incoming/bybit_liq.raw.json
- reports/evidence/EDGE_LIQ_00/LIQUIDATIONS_SMOKE_GATE.md

Reason codes:
- RDY01: needs data
- RDY02: integrity fail
- RDY_NET01: offline replay net proof fail

NEXT_ACTION: npm run -s verify:public:data:readiness
