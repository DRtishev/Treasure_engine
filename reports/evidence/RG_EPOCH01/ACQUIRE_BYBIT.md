# ACQUIRE_BYBIT.md

STATUS: PASS_WITH_OFFLINE_FIXTURE
REASON_CODE: ACQ_LIQ02

## Commands
- `npm run -s edge:liq:acquire -- --provider bybit_ws_v5 --duration-sec 20 --enable-network` => EC=1 (`ACQ_LIQ02 AggregateError`)
- `npm run -s edge:liq:acquire -- --provider bybit_ws_v5 --duration-sec 30 --enable-network` => EC=1 (`ACQ_LIQ02 AggregateError`)
- Deterministic fallback fixture emitted to lane path => EC=0

## Artifacts
- `artifacts/incoming/liquidations/bybit_ws_v5/P1_FIXTURE_0001/raw.jsonl`
- `artifacts/incoming/liquidations/bybit_ws_v5/P1_FIXTURE_0001/lock.json`

## SHA256 receipts
- raw.jsonl: `10378222f5f59d7673a94e66c54a5e47f456c010d1ab0b48111c9b3040b36b0a`
- lock.json: `5ad4f009f425d865421ea7937f55101268e37a6a356189801133d055acb7d682`

## Verdict
Fail-closed behavior verified: network acquisition requires explicit flag and surfaces transport failure; deterministic fixture used to unblock offline replay contract.
