# INCIDENT_PLAYBOOK.md — Micro-Live Incident Response Playbook

epoch: MICRO_LIVE_SRE_COURT_V1
version: 1.0.0
last_updated: 2026-02-21

## Purpose

Defines incident response procedures for micro-live trading operations.
Validated by edge_micro_live_sre.mjs (presence check only — content is for operators).

---

## Severity Levels

| Severity | Definition | Response Time | Example |
|----------|-----------|--------------|---------|
| P0 | Complete system outage / runaway position | Immediate (<5 min) | Kill switch triggered, uncontrolled PnL loss |
| P1 | Core SLO breach / data feed failure | 15 minutes | SLO-01 gap >5 min, order rejection spike |
| P2 | Degraded performance / partial SLO breach | 1 hour | Latency p95 >1000ms, fill rate 95-99% |
| P3 | Informational / monitoring anomaly | Next business day | Single missed bar, minor slippage variance |

---

## Kill Switch Procedure (P0)

**STOP ALL TRADING IMMEDIATELY:**

```
1. Trigger kill switch: set KILL_SWITCH=1 in config (halts all signal processing)
2. Cancel all open orders via exchange API
3. Confirm position = 0 or document residual exposure
4. Page on-call operator immediately
5. Do NOT restart without explicit approval from post-incident review
```

Hard stop criteria (auto-trigger):
- Daily PnL loss > 2× max_daily_loss configured in PAPER_TO_MICRO_LIVE_PROTOCOL.md
- Position size > 1.5× max notional
- Order reject rate > 10% in any 5-minute window
- Data feed gap > 5 minutes

---

## P1 Response: SLO-01 Data Feed Failure

```
1. Confirm: data_feed_uptime SLI < 99.5% OR bar_staleness_p99 > 120s
2. Pause new signal generation (do NOT cancel open orders)
3. Check data provider status page
4. If gap < 10 minutes: wait and re-sync
5. If gap > 10 minutes: switch to backup feed OR halt new orders
6. Document incident start time and data gap duration
7. File postmortem if gap > 30 minutes (POSTMORTEM_TEMPLATE.md)
```

Error budget consumed: 1 hour gap = ~28% of monthly budget (SLO-01).

---

## P1 Response: Order Execution Failure (SLO-03)

```
1. Confirm: order_success_rate SLI < 99.5% for >5 consecutive orders
2. Check venue status (Binance status page)
3. Confirm API key permissions are valid (not expired)
4. If venue issue: halt new orders, maintain existing positions
5. If local issue: restart order manager, verify connectivity
6. If reject_rate > 1%: trigger P0 kill switch protocol
```

---

## P2 Response: Latency Degradation (SLO-02)

```
1. Confirm: signal_latency p99 > 1000ms for >3 consecutive bars
2. Check system load (CPU, memory, network)
3. Check co-location / VPS health
4. If latency < 2000ms: continue trading, monitor closely
5. If latency > 2000ms: pause new orders (existing fills complete normally)
6. Log to incident tracker with timestamps
```

---

## Error Budget Status Actions

| Budget Status | Allowed Actions |
|--------------|----------------|
| GREEN (>50% remaining) | Normal operations. Hack promotion UNBLOCKED. |
| YELLOW (25-50% remaining) | No new hack promotions. Existing positions managed normally. |
| ORANGE (10-25% remaining) | Reduce position sizes by 50%. No new strategies. |
| RED (<10% remaining) | HALT all new orders. Maintain positions only. Incident review required. |

---

## Post-Incident Requirements

After any P0 or P1 incident:
1. File postmortem within 48 hours (use POSTMORTEM_TEMPLATE.md)
2. Identify root cause (system / data / strategy / operator error)
3. Add retrospective action items to issue tracker
4. Update SLI measurements with actual incident data
5. Re-run edge:all to verify court status post-recovery

---

## Communication Protocol

| Audience | Channel | Timing |
|----------|---------|--------|
| On-call operator | PagerDuty / phone | Immediate (P0/P1) |
| Team | Slack #incidents | Within 15 minutes |
| Stakeholders | Email summary | Within 1 hour (P0/P1) |
| Post-incident | Written postmortem | Within 48 hours |

---

## Required On-Call Information

Before go-live, verify:
- [ ] Kill switch mechanism tested and documented
- [ ] Exchange API emergency cancellation tested
- [ ] On-call rotation with contact numbers documented
- [ ] PagerDuty / alerting system configured
- [ ] Backup data feed identified and tested
- [ ] Runbook (RUNBOOK_EDGE.md) reviewed by on-call team
