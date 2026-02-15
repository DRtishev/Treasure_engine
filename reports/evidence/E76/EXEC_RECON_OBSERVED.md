# E76 EXEC RECON OBSERVED
- mode: AUTO_FROM_FIXTURE
- statement: NO LIVE IO PERFORMED; fixture-based only
- symbol: BTCUSDT
- time_window: 2026-02-01T00:00:01Z..2026-02-01T00:00:15Z
- fixture: core/edge/fixtures/e76_recon_observed_fixture.csv
- fixture_sha256: d71a281e7e48059de5253254cf13d4cb3f21bfb1cbfd8ac6a986238e129cbf9c

| parameter | observed |
|---|---:|
| maker_fee_bps | 1 |
| taker_fee_bps | 5.5 |
| spread_median_bps | 2.2 |
| spread_p95_bps | 3.1 |
| slippage_small_median_bps | 2.1 |
| slippage_medium_median_bps | 3.1 |
| slippage_large_median_bps | 5.2 |
| latency_decision_submit_median_ms | 23 |
| latency_submit_ack_median_ms | 26 |
| latency_ack_fill_median_ms | 57 |
| tick_size | 0.1 |
| lot_size | 0.001 |
| min_qty | 0.001 |
| min_notional | 5 |

## SOURCES
- official: Bybit API docs (instruments/fees/rate-limits), checked 2026-02-15T09:00:00Z
- alternate: exchange fee schedule mirror + microstructure reference, checked 2026-02-15T09:20:00Z
