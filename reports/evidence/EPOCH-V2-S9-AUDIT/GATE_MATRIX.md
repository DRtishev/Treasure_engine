# EPOCH-V2-S9 AUDIT — Gate Matrix

## verify:fast (x2 deterministic)

| Gate | Run1 | Run2 | Sprint |
|------|------|------|--------|
| All existing regression gates | PASS | PASS | S4-S8 |
| regression_realism_wiring_fast01 | PASS | PASS | **S9** |
| regression_promo_canary_wiring_fast01 | PASS | PASS | **S9** |

## e108 (x2 deterministic)

| Gate | Run1 | Run2 |
|------|------|------|
| e108_backtest_determinism_x2_contract | PASS (10/10) | PASS (10/10) |

## verify:deep

| Gate | Result | Sprint |
|------|--------|--------|
| regression_profit_e2e_ks01 | PASS | S5b |
| regression_profit_e2e_sizer01 | PASS | S5b |
| dryrun_live_e2e_v2 | PASS | S5b |
| regression_profit_e2e_ks02_autotick | PASS | S5c |
| regression_profit_e2e_sizer02_enforced | PASS | S5c |
| regression_realism03_parity_e2e | PASS | S7 |
| regression_realism04_partial_fill_e2e | PASS | S7 |
| regression_realism05_funding_bounds | PASS | S7 |
| regression_promo_e2e01_paper_to_microlive | PASS | S8 |
| regression_promo_e2e02_failclosed | PASS | S8 |
| regression_canary_e2e01_daily_loss | PASS | S8 |
| regression_canary_e2e02_order_rate | PASS | S8 |
| regression_realism06_paper_uses_costmodel_e2e | PASS | **S9** |
| regression_realism07_dryrun_uses_costmodel_e2e | PASS | **S9** |
| regression_promo03_integration_e2e | PASS | **S9** |
| regression_canary03_integration_e2e | PASS | **S9** |

## Victory Seal

| Gate | Result |
|------|--------|
| executor_epoch_victory_seal | PASS |
