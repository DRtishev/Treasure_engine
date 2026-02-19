# SLO_SLI.md — Service Level Objectives and Indicators
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

Defines the Service Level Objectives (SLOs) and Service Level Indicators (SLIs) for the EDGE_LAB system. SLOs represent our reliability commitments. SLIs are the measurable signals that tell us whether we're meeting them.

---

## SLO Definitions

### SLO-01: Data Feed Availability
**What:** OHLCV data must be available and current for all active instruments

| SLI | Measurement | Target | Burn Rate Alert |
|-----|------------|--------|----------------|
| data_feed_uptime | Fraction of 1h windows with < 3 missing bars | >= 99.5% | > 2x burn rate |
| bar_staleness_p99 | 99th percentile time from bar_close to data_available | < 60 seconds | > 120 sec |
| gap_detection_rate | Gaps detected before any trade execution | 100% | < 100% = alert |

**Error Budget:** 0.5% downtime = 3.6 hours per 30 days

---

### SLO-02: Signal Generation Latency
**What:** Signals must be generated within acceptable latency from bar close

| SLI | Measurement | Target | Burn Rate Alert |
|-----|------------|--------|----------------|
| signal_latency_p50 | Median: bar_close to signal_generated | < 500ms | > 1000ms |
| signal_latency_p99 | 99th pct: bar_close to signal_generated | < 2000ms | > 5000ms |
| signal_generation_success_rate | Signals generated / bars processed | >= 99.9% | < 99.5% |

---

### SLO-03: Order Execution Reliability
**What:** Orders must execute reliably once signals are generated

| SLI | Measurement | Target | Burn Rate Alert |
|-----|------------|--------|----------------|
| order_success_rate | Orders filled / orders placed | >= 99.5% | < 99% |
| order_latency_p99 | 99th pct: order_placed to fill_confirmed | < 2000ms | > 5000ms |
| slippage_p99 | 99th pct of abs(fill_price - signal_price) / signal_price | < 0.20% | > 0.50% |
| fill_price_deviation | Mean abs deviation of fill from signal price | < 0.05% | > 0.10% |

---

### SLO-04: Position & P&L Accuracy
**What:** Position tracking must be accurate and P&L calculations must be correct

| SLI | Measurement | Target | Burn Rate Alert |
|-----|------------|--------|----------------|
| position_mismatch_rate | Seconds with position_system != position_exchange | < 0.1% of uptime | > 1% |
| pnl_reconciliation_error | |system_pnl - exchange_pnl| / |exchange_pnl| | < 0.01% | > 0.05% |
| risk_calculation_latency | Time from position change to risk update | < 100ms | > 500ms |

---

### SLO-05: Risk FSM Responsiveness
**What:** The Risk FSM must respond to limit breaches within defined latency

| SLI | Measurement | Target | Burn Rate Alert |
|-----|------------|--------|----------------|
| fsm_transition_latency | Time from limit_breach_detected to state_changed | < 500ms | > 2000ms |
| hard_limit_halt_latency | Time from hard_limit_breach to no_new_orders | < 1000ms | > 3000ms |
| emergency_halt_latency | Time from emergency_trigger to all_orders_cancelled | < 2000ms | > 5000ms |

---

### SLO-06: System Availability
**What:** Core system components must maintain high availability

| SLI | Measurement | Target | Burn Rate Alert |
|-----|------------|--------|----------------|
| system_uptime | Fraction of time core system is operational | >= 99.9% | 2x burn rate |
| scheduled_task_success | Scheduled bar-close tasks completed on time | >= 99.5% | < 99% |
| heartbeat_continuity | Heartbeat signals without interruption | >= 99.9% | 2x burn rate |

---

### SLO-07: Backtest / Research Infrastructure
**What:** Research infrastructure must support reliable backtesting and reporting

| SLI | Measurement | Target | Burn Rate Alert |
|-----|------------|--------|----------------|
| backtest_reproducibility | Same seed + params produces identical results | 100% | < 100% = BLOCK |
| evidence_generation_success | edge:all completes without error | 100% | Any failure = alert |
| court_file_completeness | All expected court files present after edge:all | 100% | Any missing = BLOCK |

---

## SLO Error Budget Policy

See ERROR_BUDGET_POLICY.md for full policy. Summary:

| SLO | Monthly Budget | Budget Consumed By | Response |
|-----|---------------|-------------------|---------|
| SLO-01 | 3.6 hours downtime | Data feed gaps | Auto-alert; operator review |
| SLO-02 | 0.1% failures | Signal latency spikes | Auto-alert |
| SLO-03 | 0.5% order failures | Exchange API issues | Auto-alert; pause if > 1% |
| SLO-04 | 0.1% mismatch | Reconciliation errors | Auto-halt; operator required |
| SLO-05 | 500ms breach response | FSM latency | Auto-alert; hot-fix required |
| SLO-06 | 43 minutes downtime | System crashes | Auto-restart; PagerDuty |
| SLO-07 | 0 failures | Backtest infrastructure | Any failure = blocker |

---

## SLI Measurement Implementation

### Data Collection Points
- **SLO-01:** Collected by data ingestion pipeline; logged per-bar
- **SLO-02:** Timestamped at signal generation; logged per-signal
- **SLO-03:** Timestamped at order placement and fill; logged per-order
- **SLO-04:** Reconciled after each trade; reconciliation runs every 5 minutes
- **SLO-05:** FSM state change log includes transition timestamps
- **SLO-06:** System heartbeat every 30 seconds; logged to health check endpoint
- **SLO-07:** edge:all run timestamp and exit code logged

### Alerting Thresholds
```
WARN  = 1x error budget burn rate
ALERT = 2x error budget burn rate
CRITICAL = 5x error budget burn rate (page on-call)
```

---

## SLO Review Cadence

| Review Type | Frequency | Owner |
|------------|----------|-------|
| SLI data review | Weekly | Engineer |
| SLO compliance review | Monthly | Tech Lead |
| Error budget reset | Monthly (calendar) | Automatic |
| SLO target revision | Quarterly | Team |
| SLO policy update | Semi-annually | Team |
