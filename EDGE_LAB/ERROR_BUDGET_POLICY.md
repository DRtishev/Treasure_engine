# ERROR_BUDGET_POLICY.md — Error Budget Policy
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

Defines how EDGE_LAB manages reliability trade-offs using error budgets. An error budget is the amount of downtime or failures that a service can accumulate before SLOs are breached. Error budgets create a shared incentive between reliability and feature velocity.

---

## Error Budget Principles

1. **Error budgets are a tool, not a punishment.** When budget remains, teams can move fast. When budget is exhausted, reliability work takes priority.
2. **Error budgets reset monthly.** Fresh start on the 1st of each calendar month.
3. **Budget exhaustion triggers a feature freeze.** No new features/deployments until budget recovers.
4. **Emergency fixes are exempt.** Critical security or safety fixes bypass the freeze.

---

## Error Budget Calculations

### Monthly Budgets by SLO

| SLO | Target | Error Rate Allowed | Monthly Budget |
|-----|--------|-------------------|---------------|
| SLO-01 (Data Feed) | 99.5% | 0.5% | 3.6 hours downtime |
| SLO-02 (Signal Latency) | 99.9% | 0.1% | 43.2 minutes degraded |
| SLO-03 (Order Execution) | 99.5% | 0.5% | 0.5% of orders |
| SLO-04 (P&L Accuracy) | 99.9% | 0.1% | 43.2 minutes mismatch |
| SLO-05 (FSM Response) | 99.9% | 0.1% | 43.2 minutes slow response |
| SLO-06 (Availability) | 99.9% | 0.1% | 43.2 minutes downtime |
| SLO-07 (Research Infra) | 100% | 0% | Zero failures allowed |

---

## Budget Consumption Rules

### What Consumes Budget

| Event | Budget Impact | SLO Affected |
|-------|--------------|-------------|
| Data feed gap (per minute of missing data) | 1 minute | SLO-01 |
| Signal latency > p99 threshold | 0.1% of window | SLO-02 |
| Failed order (unrecovered) | 1 order failure count | SLO-03 |
| Position mismatch (per minute) | 1 minute | SLO-04 |
| FSM response > 2000ms | 1 slow-response count | SLO-05 |
| System downtime (per minute) | 1 minute | SLO-06 |
| edge:all failure | Full budget depletion | SLO-07 |
| Backtest non-reproducibility | Full budget depletion | SLO-07 |

### What Does NOT Consume Budget
- Planned maintenance (requires 24h advance notice)
- Exchange-wide outages (documented exchange-side failures)
- Force majeure events (regulatory changes, natural disasters)
- Scheduled upgrades during low-activity windows

---

## Policy Responses by Budget Status

### Budget Remaining > 50%: GREEN
```
Status: GREEN
Actions allowed: All development and deployments
Review cadence: Weekly SLI review
```

### Budget Remaining 25-50%: YELLOW
```
Status: YELLOW
Actions: Development continues; new deployments require review
Required: Investigate root cause of budget consumption
Review cadence: Twice-weekly SLI review
Notification: Team lead notified
```

### Budget Remaining 10-25%: ORANGE
```
Status: ORANGE
Actions: Feature deployments paused; reliability work prioritized
Required: Incident review within 48 hours
Review cadence: Daily SLI review
Notification: All engineers notified
Restriction: No new hack activations until budget recovers to GREEN
```

### Budget Remaining < 10%: RED
```
Status: RED
Actions: All non-critical deployments frozen; SRE work only
Required: Emergency postmortem within 24 hours
Review cadence: Twice-daily SLI review
Notification: All stakeholders notified; escalate to management
Restriction: No new trades for affected SLO component until operator review
```

### Budget Exhausted (0%): CRITICAL
```
Status: CRITICAL
Actions: Complete feature freeze; reliability fix only
Required: Operator approval before any system change
Review cadence: Continuous monitoring until recovery
Notification: PagerDuty alert; all team members
Trading restriction: Reduce to minimum viable operations
Recovery plan: Must be filed within 12 hours
```

---

## Budget Recovery

### Automatic Recovery
Error budgets recover linearly over the month. Budget is not "refilled" early; it recovers as the month progresses without new violations.

### Emergency Budget Top-Up
In exceptional circumstances, the operator can grant a one-time budget extension of up to 24 hours. Requirements:
1. Root cause clearly identified
2. Mitigation deployed
3. Documentation filed
4. Team vote (majority required)

---

## Error Budget Report Template

Monthly error budget reports are filed in reports/evidence/EDGE_LAB/:

```markdown
# Error Budget Report — [MONTH] [YEAR]

## Budget Status
| SLO | Budget Start | Consumed | Remaining | Status |
|-----|-------------|---------|----------|--------|
| SLO-01 | 3.6h | [X]h [Y]m | [Z]h | GREEN/YELLOW/ORANGE/RED |

## Incidents
| Date | SLO | Duration | Root Cause | Budget Impact | Resolved |
|------|-----|---------|-----------|--------------|---------|

## Actions
- [ ] Action 1
- [ ] Action 2

## Next Month Goals
- Reduce [metric] from [X] to [Y]
```

---

## Error Budget Integration with Edge Development

### Hack Promotion Gate
A hack cannot be promoted from DRAFT to TESTING if any SLO is in RED status.

**Rationale:** Running new optimization trials during reliability incidents risks data contamination and resource contention.

### New Deployment Gate
A new ELIGIBLE hack cannot go live if:
- SLO-01 (Data Feed) is in ORANGE or RED
- SLO-03 (Order Execution) is in ORANGE or RED
- Any SLO is in CRITICAL

### Ongoing Hack Suspension
Any TESTING or ELIGIBLE hack is automatically suspended (signals paused, no new entries) if:
- SLO-04 (P&L Accuracy) goes RED (position tracking unreliable)
- SLO-05 (FSM Response) goes RED (risk management unreliable)
