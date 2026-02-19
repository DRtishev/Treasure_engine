# RISK_FSM.md — Risk Finite State Machine
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

Defines the finite state machine governing risk management states for the EDGE_LAB system. The FSM controls when trading is permitted, throttled, or halted based on real-time risk metrics.

---

## FSM States

### State Definitions

| State | ID | Description | Trading Allowed |
|-------|-----|-------------|----------------|
| NOMINAL | S0 | All metrics within normal bounds; full operation | YES (full size) |
| CAUTIOUS | S1 | One or more soft limit breaches; reduced position size | YES (50% size) |
| THROTTLED | S2 | Multiple soft limit breaches or one hard limit approach | YES (25% size) |
| HALTED | S3 | Hard limit breached; all new positions blocked | NO |
| EMERGENCY | S4 | System anomaly, data loss, or circuit breaker triggered | NO |
| RECOVERY | S5 | Post-halt cooldown period; awaiting operator approval | NO |

---

## State Transition Diagram

```
                    ┌─────────────────────────────────┐
                    │           NOMINAL (S0)            │
                    │     Full trading permitted         │
                    └───────────────┬─────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │ soft_limit_breach   │ hard_limit_approach  │
              │ (1 metric)          │ (≥3 soft breaches)   │
              ▼                     │                       │
    ┌───────────────────┐           │                       │
    │   CAUTIOUS (S1)   │           │                       │
    │   50% position    │           │                       │
    └─────────┬─────────┘           │                       │
              │                     │                       │
   ┌──────────┼──────────┐          │                       │
   │          │          │          │                       │
 resolved  escalate  direct_hard    │                       │
   │      (≥2 more)  limit_breach   │                       │
   │          │          │          │                       │
   ▼          ▼          ▼          ▼                       ▼
 NOMINAL   THROTTLED (S2)          HALTED (S3)           EMERGENCY (S4)
           25% position            No new trades          System anomaly
                │                       │                       │
                │ hard_limit_breach      │ operator_review       │ operator_clears
                ▼                       ▼                       ▼
             HALTED (S3)            RECOVERY (S5)           RECOVERY (S5)
                                        │
                                   operator_approves
                                        │
                                        ▼
                                    NOMINAL (S0)
```

---

## Trigger Conditions

### Soft Limit Triggers (S0 → S1)

| Trigger | Threshold | Measurement Window |
|---------|-----------|-------------------|
| DRAWDOWN_SOFT | Equity drawdown > 5% | From rolling 30-day peak |
| DAILY_LOSS_SOFT | Daily P&L < -2% equity | Rolling 24 hours |
| VOLATILITY_SOFT | ATR > 3x 20-period average | Current bar vs MA |
| CONSECUTIVE_LOSSES_SOFT | 5+ consecutive losing trades | Rolling trade sequence |
| POSITION_LIMIT_SOFT | Open positions > 4 | Real-time count |

### Hard Limit Triggers (Any State → S3)

| Trigger | Threshold | Action |
|---------|-----------|--------|
| DRAWDOWN_HARD | Equity drawdown > 10% | Immediate halt |
| DAILY_LOSS_HARD | Daily P&L < -5% equity | Immediate halt |
| CONSECUTIVE_LOSSES_HARD | 10+ consecutive losing trades | Immediate halt |
| POSITION_LIMIT_HARD | Open positions > 7 | Block new entries |
| MAX_LEVERAGE_BREACH | Effective leverage > 3x | Immediate halt |
| MARGIN_WARNING | Free margin < 20% | Immediate halt |

### Emergency Triggers (Any State → S4)

| Trigger | Condition | Action |
|---------|-----------|--------|
| DATA_STALENESS | No bar data for > 10 bar periods | Emergency halt |
| API_FAILURE | Exchange API unreachable > 60 seconds | Emergency halt |
| EXECUTION_ANOMALY | Fill price > 1% from signal price | Emergency halt |
| SYSTEM_ANOMALY | Unexpected position mismatch | Emergency halt |
| MANUAL_EMERGENCY | Operator triggers emergency button | Emergency halt |

---

## State Behaviors

### NOMINAL (S0)
```
position_size_pct = 1.00  # 100% of calculated position size
new_entries_allowed = true
new_exits_allowed = true
monitoring_interval_sec = 60
```

### CAUTIOUS (S1)
```
position_size_pct = 0.50  # 50% of calculated position size
new_entries_allowed = true
new_exits_allowed = true
monitoring_interval_sec = 30
alert = "CAUTIOUS mode: reduced position sizing"
```

### THROTTLED (S2)
```
position_size_pct = 0.25  # 25% of calculated position size
new_entries_allowed = true
new_exits_allowed = true
monitoring_interval_sec = 15
alert = "THROTTLED mode: significantly reduced sizing"
```

### HALTED (S3)
```
position_size_pct = 0.00  # No new positions
new_entries_allowed = false
new_exits_allowed = true  # Always allow exits
existing_stops_active = true  # All stop orders remain active
monitoring_interval_sec = 10
alert = "HALTED: no new positions until operator review"
recovery_conditions = ["drawdown < 8%", "daily_loss < 4%", "operator_approval"]
```

### EMERGENCY (S4)
```
position_size_pct = 0.00
new_entries_allowed = false
new_exits_allowed = true  # Emergency exit if needed
force_close_all = false  # Operator decision required
monitoring_interval_sec = 5
alert_priority = "CRITICAL"
notify_channels = ["email", "sms", "slack"]
```

### RECOVERY (S5)
```
position_size_pct = 0.00
new_entries_allowed = false
new_exits_allowed = true
cooldown_period_hours = 24  # Minimum 24h before NOMINAL
operator_approval_required = true
monitoring_interval_sec = 60
```

---

## FSM Implementation Checkpoints

The FSM must be evaluated at these checkpoints:
1. **Pre-signal:** Before generating any new trading signal
2. **Pre-order:** Before placing any order
3. **Post-fill:** After receiving trade confirmation
4. **Bar close:** At end of each bar period
5. **Continuous:** Emergency triggers monitored in real-time

---

## Recovery Protocol

1. **Identify trigger:** Document which hard/emergency limit was breached
2. **Assess damage:** Review all open positions and unrealized P&L
3. **Cooldown:** Minimum 24 hours in RECOVERY state
4. **Operator review:** Human must approve transition from RECOVERY → NOMINAL
5. **Postmortem:** File POSTMORTEM_TEMPLATE.md entry within 48 hours
6. **Threshold review:** Consider adjusting thresholds if triggered by market anomaly

---

## Risk FSM Audit Log

All state transitions must be logged:
```
{
  "timestamp": "unix_ms",
  "from_state": "S0",
  "to_state": "S1",
  "trigger": "DRAWDOWN_SOFT",
  "trigger_value": 0.052,
  "threshold": 0.05,
  "operator_notified": true
}
```
