# RISK_COURT.md — Risk FSM Validation Report
generated_at: RUN_ID
script: edge_risk.mjs

## STATUS: PASS

## File Validation
| File | Exists |
|------|--------|
| EDGE_LAB/RISK_FSM.md | YES |

## FSM State Definitions
| State | Present | Result |
|-------|---------|--------|
| NOMINAL | DEFINED | PASS |
| CAUTIOUS | DEFINED | PASS |
| THROTTLED | DEFINED | PASS |
| HALTED | DEFINED | PASS |
| EMERGENCY | DEFINED | PASS |
| RECOVERY | DEFINED | PASS |

## State Behavior Validation
| Behavior | Result |
|---------|--------|
| NOMINAL: position_size_pct = 1.00 | PASS |
| CAUTIOUS: position_size_pct = 0.50 | PASS |
| THROTTLED: position_size_pct = 0.25 | PASS |
| HALTED: no new entries | PASS |
| EMERGENCY: exits still allowed | PASS |
| RECOVERY: operator approval required | PASS |

## Soft Trigger Conditions
| Trigger | Result |
|---------|--------|
| DRAWDOWN_SOFT | PASS |
| DAILY_LOSS_SOFT | PASS |
| VOLATILITY_SOFT | PASS |
| CONSECUTIVE_LOSSES_SOFT | PASS |

## Hard Trigger Conditions
| Trigger | Result |
|---------|--------|
| DRAWDOWN_HARD | PASS |
| DAILY_LOSS_HARD | PASS |
| CONSECUTIVE_LOSSES_HARD | PASS |
| MAX_LEVERAGE_BREACH | PASS |

## Emergency Trigger Conditions
| Trigger | Result |
|---------|--------|
| DATA_STALENESS | PASS |
| API_FAILURE | PASS |
| EXECUTION_ANOMALY | PASS |
| SYSTEM_ANOMALY | PASS |

## Recovery Protocol
| Check | Result |
|-------|--------|
| Recovery protocol defined | PASS |
| Audit log format defined | PASS |
| Minimum cooldown defined | PASS |
| Operator approval required | PASS |
| Postmortem requirement | PASS |

## Key Threshold Summary
| Threshold | Type | Value |
|-----------|------|-------|
| DRAWDOWN_SOFT | Soft limit | 5% from 30-day peak |
| DRAWDOWN_HARD | Hard limit | 10% from 30-day peak |
| DAILY_LOSS_SOFT | Soft limit | -2% equity |
| DAILY_LOSS_HARD | Hard limit | -5% equity |
| VOLATILITY_SOFT | Soft limit | ATR > 3x 20-period average |
| CONSECUTIVE_LOSSES_SOFT | Soft limit | 5+ consecutive losses |
| CONSECUTIVE_LOSSES_HARD | Hard limit | 10+ consecutive losses |
| MAX_LEVERAGE_BREACH | Hard limit | Leverage > 3x |
| DATA_STALENESS | Emergency | No bars > 10 bar periods |
| API_FAILURE | Emergency | API unreachable > 60 seconds |
| EXECUTION_ANOMALY | Emergency | Fill > 1% from signal price |

## FSM State Machine Completeness
| Aspect | Status |
|--------|--------|
| All 6 states defined | PASS |
| Transitions documented | PASS |
| Position sizing per state | PASS |
| Soft/hard/emergency triggers | PASS |
| Recovery protocol complete | PASS |

## Failed Required Checks
None — all required checks passed.

## Verdict
Risk FSM fully validated. All 6 states defined. All trigger conditions documented. Risk court PASSED.
