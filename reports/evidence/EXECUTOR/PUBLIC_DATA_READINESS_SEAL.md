# PUBLIC_DATA_READINESS_SEAL.md

STATUS: NEEDS_DATA
REASON_CODE: RDY01
RUN_ID: da818a2b701a
NEXT_ACTION: npm run -s verify:public:data:readiness

- required: artifacts/incoming/bybit_liq.lock.json
- required: artifacts/incoming/bybit_liq.raw.json
- missing: artifacts/incoming/bybit_liq.lock.json
- missing: artifacts/incoming/bybit_liq.raw.json
- replay_ec: 0
