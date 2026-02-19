# POSTMORTEM_TEMPLATE.md — Postmortem Template
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

Template for documenting incidents, system failures, and unexpected trading losses. Postmortems are blameless — the goal is learning, not fault assignment.

---

## Postmortem Filing Requirements

- **When to file:** Any of the following triggers a required postmortem:
  - System downtime > 30 minutes
  - Risk FSM transitions to HALTED or EMERGENCY state
  - Trading loss > 3% of account equity in a single day
  - P&L or position reconciliation failure
  - Data integrity violation detected
  - Any SLO goes into RED status
- **Filing deadline:** Within 48 hours of incident resolution
- **Storage:** `reports/evidence/EDGE_LAB/postmortems/POSTMORTEM_[DATE]_[INCIDENT_ID].md`

---

## Postmortem Template

```markdown
# Postmortem — [INCIDENT_ID]: [Brief Title]

## Incident Summary
- **Incident ID:** PM_[YYYYMMDD]_[NNN]
- **Date:** [YYYY-MM-DD]
- **Duration:** [Start time] to [End time] ([total minutes])
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **SLOs Impacted:** [list SLO IDs]
- **Error Budget Consumed:** [amount per SLO]
- **Author:** [name/handle]
- **Reviewers:** [name(s)]
- **Status:** DRAFT / REVIEW / FINAL

## Impact
- **Trading Impact:** [positions affected, P&L impact in USD and %]
- **User Impact:** [who was affected]
- **System Impact:** [which components failed]
- **Data Impact:** [was data integrity affected?]

## Timeline

| Time (UTC) | Event |
|-----------|-------|
| HH:MM | [Event description] |
| HH:MM | [Event description] |
| HH:MM | [Resolution / system restored] |

## Root Cause Analysis

### Immediate Cause
[What directly caused the incident? Be specific.]

### Contributing Factors
1. [Factor 1]
2. [Factor 2]
3. [Factor 3]

### Root Cause
[The underlying systemic reason why this happened. Not the surface-level trigger.]

## What Went Well
- [Thing 1]
- [Thing 2]

## What Did Not Go Well
- [Thing 1]
- [Thing 2]

## Detection
- How was the incident detected? [monitoring alert / manual discovery / user report]
- How long after the incident began was it detected? [duration]
- Was the detection method adequate? [YES / NO / PARTIALLY]

## Action Items

| Action | Owner | Priority | Due Date | Status |
|--------|-------|---------|---------|--------|
| [Action description] | [name] | HIGH/MEDIUM/LOW | [date] | OPEN |

## Lessons Learned
1. [Lesson 1]
2. [Lesson 2]

## Follow-Up Reviews
- [ ] SLO threshold review scheduled?
- [ ] RISK_FSM.md update required?
- [ ] SOURCES_POLICY.md update required?
- [ ] ERROR_BUDGET_POLICY.md update required?
- [ ] RUNBOOK_EDGE.md runbook updated?
- [ ] Monitoring/alerting improved?
```

---

## Postmortem Log

| PM_ID | Date | Title | Severity | SLOs Impacted | Status |
|-------|------|-------|---------|--------------|--------|
| — | — | No postmortems filed yet | — | — | — |

---

## Blameless Culture Guidelines

1. **Assume good intent:** Engineers made the best decisions with the information they had at the time.
2. **Focus on systems, not individuals:** Ask "what in our process allowed this?" not "who caused this?"
3. **No punitive measures:** Postmortems must never be used in performance evaluations.
4. **Encourage reporting:** Unreported incidents are more dangerous than reported ones.
5. **Complete action items:** A postmortem without completed action items is incomplete.
6. **Share learnings:** Postmortems should be shared with the whole team after FINAL status.

---

## Incident Severity Definitions

| Severity | Definition | Response Time |
|---------|-----------|--------------|
| CRITICAL | Trading halted; data integrity breached; > 5% equity loss | Immediate (< 15 min) |
| HIGH | SLO RED; Risk FSM in HALTED/EMERGENCY; > 3% equity loss | < 1 hour |
| MEDIUM | SLO ORANGE; unusual but recoverable loss; data gap > 1h | < 4 hours |
| LOW | SLO YELLOW; minor disruption; no trading impact | < 24 hours |
