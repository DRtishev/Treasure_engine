# AGENT REPORT TEMPLATE

> Copy and fill all 7 required sections. Missing any section => invalid report.

---

## SNAPSHOT

<Describe the current state: what was the problem/task, what is the starting condition.>

---

## WHAT_CHANGED

<!-- List all files changed, created, or deleted -->
- (none)

---

## COMMANDS_EXECUTED

<!-- List every command run with exact exit code -->
- `npm run -s verify:fast` => EC=0
- `npm run -s ops:timemachine` => EC=0

---

## GATE_MATRIX

| Gate | Status | Reason Code | Surface |
|------|--------|-------------|---------|
| RG_AGENT01_AGENTS_PRESENT | PASS | NONE | UX |
| RG_AGENT02_CLAUDE_MD_DRIFT | PASS | NONE | UX |
| RG_TIME01_STABLE_TICK_ORDER | PASS | NONE | UX |
| RG_TIME02_NO_TIME_FIELDS | PASS | NONE | UX |
| RG_AUTO01_MODE_ROUTER | PASS | NONE | PR |
| RG_AUTO02_NO_CERT_IN_RESEARCH | PASS | NONE | OFFLINE_AUTHORITY |
| RG_AUTO03_PR_CLEANROOM_APPLIED | PASS | NONE | PR |

---

## EVIDENCE_PATHS

<!-- List exact paths to evidence files -->
- reports/evidence/EPOCH-XYZ/gates/manual/regression_agent01_agents_present.json

---

## VERDICT

<!-- PASS, BLOCKED, or FAIL with honest assessment -->
PASS

---

## ONE_NEXT_ACTION

<!-- Single executable command only -->
```bash
npm run -s verify:fast
```
