# E110 EXECUTION COST MODEL

## Venue Profiles
| Venue | Maker_bps | Taker_bps | Slip_bps | Latency_ms |
| --- | --- | --- | --- | --- |
| bybit_linear | 1 | 6 | 2 | 50 |
| fixture | 4 | 4 | 2 | 0 |

## Expected Cost Examples
| Notional | Venue | Type | Fee$ | Slip$ | Total$ | Cost_bps |
| --- | --- | --- | --- | --- | --- | --- |
| $20 | fixture | MARKET | 0.0080 | 0.0040 | 0.0120 | 6.00 |
| $100 | fixture | MARKET | 0.0400 | 0.0200 | 0.0600 | 6.00 |
| $100 | bybit_linear | MARKET | 0.0600 | 0.0200 | 0.0800 | 8.00 |
| $100 | bybit_linear | LIMIT | 0.0100 | 0.0200 | 0.0300 | 3.00 |

## Model Properties
- Deterministic: same inputs produce same outputs
- Configurable per venue: maker/taker, slippage, latency
- No hidden costs: all components explicit
