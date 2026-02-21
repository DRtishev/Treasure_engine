# MCL_NOTES.md — Mega Closeout Notes
generated_at: 3444ae7de207
script: edge_sre.mjs

## EDGE_LAB SRE Observations

### Observation 1: SLO-07 Research Infrastructure
The edge:all pipeline must maintain 100% success rate (SLO-07). Any failure in any court script
immediately blocks the evidence generation pipeline. This is intentional: evidence quality is
non-negotiable.

**Current Status:** All court scripts run successfully. SLO-07 COMPLIANT.

### Observation 2: External Data Acquisition
4 hacks are in NEEDS_DATA status. This is NOT an SRE concern — it is a data acquisition concern.
The SRE boundary is: once data is acquired and ingested, SRE monitors data feed reliability (SLO-01).

**Recommendation:** Prioritize Binance futures API key acquisition to unblock H_FUNDING_TIMING and
H_OPEN_INTEREST_SURGE (highest-value EXTERNAL hacks).

### Observation 3: Pre-Production SLO Baseline
All SLO simulated values show GREEN status. This represents the target baseline.
Before any live trading begins, operators must:
1. Instrument real SLI collection for each SLO
2. Establish baseline measurements over 7 days
3. Confirm all SLOs are GREEN before first live order

### Observation 4: Error Budget Integration
Error budget policy gates are integrated into hack promotion workflow (ERROR_BUDGET_POLICY.md).
No DRAFT → TESTING promotions during RED SLO status.
No ELIGIBLE → LIVE deployments during ORANGE/RED for SLO-01 or SLO-03.

### Observation 5: Postmortem Culture
POSTMORTEM_TEMPLATE.md is defined but no postmortems have been filed (expected pre-production).
After first live trading incident, postmortem process must be tested and validated.

## Key Metrics to Instrument Before Go-Live
| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Bar arrival latency | Data ingestion | > 60 seconds |
| Signal generation time | Signal engine | > 2000ms |
| Order fill confirmation | Order manager | > 2000ms |
| Position reconciliation error | Risk system | > 0.01% |
| FSM state transition time | Risk FSM | > 500ms |

## MCL Sign-Off Requirements
Before EDGE_LAB moves from TESTING to ELIGIBLE status:
- [ ] All 7 SLOs instrumented and collecting real data
- [ ] 7-day SLO baseline run with all SLOs GREEN
- [ ] First postmortem process tested (simulated incident)
- [ ] On-call rotation defined
- [ ] PagerDuty or equivalent alerting configured
- [ ] External data feeds acquired (or NEEDS_DATA hacks formally deferred)
