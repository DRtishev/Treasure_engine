# RG_DATA_QUORUM01

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast
CHECKS_TOTAL: 11
VIOLATIONS: 0

## CAPSULE INVENTORY
- fixture_funding_btcusdt: funding_rate BTCUSDT 17 rows
- fixture_ohlcv_btcusdt_200bar: ohlcv BTCUSDT 200 rows
- fixture_oi_btcusdt: open_interest BTCUSDT 34 rows

## CHECKS
- [PASS] DATA_QUORUM_MIN: 3 locked capsules (min=2): fixture_funding_btcusdt, fixture_ohlcv_btcusdt_200bar, fixture_oi_btcusdt
- [PASS] INTEGRITY_fixture_funding_btcusdt: OK: sha256=1469dcddf7210084...
- [PASS] INTEGRITY_fixture_ohlcv_btcusdt_200bar: OK: sha256=0752cb5155f61629...
- [PASS] INTEGRITY_fixture_oi_btcusdt: OK: sha256=e0c005f8984f39e1...
- [PASS] SCHEMA_fixture_funding_btcusdt: OK: schema_version=1.0.0
- [PASS] SCHEMA_fixture_ohlcv_btcusdt_200bar: OK: schema_version=1.0.0
- [PASS] SCHEMA_fixture_oi_btcusdt: OK: schema_version=1.0.0
- [PASS] REPLAY_X2_fixture_funding_btcusdt: OK: hash=1469dcddf7210084... x2 identical
- [PASS] REPLAY_X2_fixture_ohlcv_btcusdt_200bar: OK: hash=0752cb5155f61629... x2 identical
- [PASS] REPLAY_X2_fixture_oi_btcusdt: OK: hash=e0c005f8984f39e1... x2 identical
- [PASS] DATA_TYPE_DIVERSITY: 3 types: funding_rate, ohlcv, open_interest

## FAILED
- NONE
