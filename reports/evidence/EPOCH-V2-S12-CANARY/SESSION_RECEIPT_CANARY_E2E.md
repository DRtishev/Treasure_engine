# SESSION_RECEIPT — Sprint 12 Canary E2E

## Session Info
- **Run ID:** RG_CANARY_SESSION01_TEST
- **Stage:** micro_live
- **Status:** COMPLETED
- **Ticks Processed:** 100
- **Total Fills:** 3

## Canary Configuration
- max_exposure_usd: 50
- max_daily_loss_usd: 0.01
- max_orders_per_min: 2
- max_daily_loss_pct: 0.01%

## Canary Events
- **Total Events:** 95
- **PAUSE/FLATTEN:** 95

1. tick=6 action=PAUSE reason=ORDER_RATE_EXCEEDED violations=[{"limit_name":"max_orders_per_min","limit_value":2,"actual_value":3,"severity":"CRITICAL"}]
2. tick=7 action=PAUSE reason=ORDER_RATE_EXCEEDED violations=[{"limit_name":"max_orders_per_min","limit_value":2,"actual_value":3,"severity":"CRITICAL"}]
3. tick=8 action=PAUSE reason=ORDER_RATE_EXCEEDED violations=[{"limit_name":"max_orders_per_min","limit_value":2,"actual_value":3,"severity":"CRITICAL"}]
4. tick=9 action=PAUSE reason=ORDER_RATE_EXCEEDED violations=[{"limit_name":"max_orders_per_min","limit_value":2,"actual_value":3,"severity":"CRITICAL"}]
5. tick=10 action=PAUSE reason=ORDER_RATE_EXCEEDED violations=[{"limit_name":"max_orders_per_min","limit_value":2,"actual_value":3,"severity":"CRITICAL"}]
6. tick=11 action=PAUSE reason=ORDER_RATE_EXCEEDED violations=[{"limit_name":"max_orders_per_min","limit_value":2,"actual_value":3,"severity":"CRITICAL"}]
7. tick=12 action=PAUSE reason=ORDER_RATE_EXCEEDED violations=[{"limit_name":"max_orders_per_min","limit_value":2,"actual_value":3,"severity":"CRITICAL"}]
8. tick=13 action=PAUSE reason=ORDER_RATE_EXCEEDED violations=[{"limit_name":"max_orders_per_min","limit_value":2,"actual_value":3,"severity":"CRITICAL"}]
9. tick=14 action=PAUSE reason=ORDER_RATE_EXCEEDED violations=[{"limit_name":"max_orders_per_min","limit_value":2,"actual_value":3,"severity":"CRITICAL"}]
10. tick=15 action=PAUSE reason=ORDER_RATE_EXCEEDED violations=[{"limit_name":"max_orders_per_min","limit_value":2,"actual_value":3,"severity":"CRITICAL"}]
... and 85 more

## Ledger Summary
- **Initial Capital:** 10000
- **Final Equity:** 10137.1039
- **Realized PnL:** 0.0000
- **Total Fees:** 0.5700
- **Max Drawdown:** 0.00%

## Promotion Result
- **Verdict:** INSUFFICIENT_DATA
- **Eligible:** false
