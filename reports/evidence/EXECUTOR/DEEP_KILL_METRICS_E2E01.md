# RG_KILL_METRICS_E2E01: Real Kill Metrics E2E

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
CHECKS: 5
VIOLATIONS: 0

- [PASS] max_drawdown_non_zero: OK: max_drawdown=0.05
- [PASS] consecutive_losses_tracked: OK: consecutive_losses=3
- [PASS] exchange_error_rate_non_zero: OK: exchange_error_rate=0.1
- [PASS] win_resets_losses: OK: win resets consecutive_losses to 0
- [PASS] drawdown_magnitude_correct: OK: drawdown=0.05 ≈ 0.05
