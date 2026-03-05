# AUDIT TEMPLATE -- After Sprint 7

## Дата: TBD (после завершения DEV)
## Контекст: EPOCH-V2-S7-AUDIT

---

## Checklist

- [ ] verify:fast x2 PASS
- [ ] e108 x2 PASS (if backtest touched)
- [ ] verify:deep PASS
- [ ] epoch:victory:seal PASS
- [ ] RG_REALISM01_COST_CONTRACT PASS
- [ ] RG_REALISM02_NO_PROXY_METRICS PASS
- [ ] RG_REALISM03_PARITY_E2E PASS
- [ ] RG_REALISM04_PARTIAL_FILL_E2E PASS
- [ ] RG_REALISM05_FUNDING_BOUNDS PASS
- [ ] All 51 baseline gates PASS (no regression)
- [ ] Frozen params contract hash verified
- [ ] COMMANDS_EXECUTED.md written
- [ ] GATE_MATRIX.md written

## Required Evidence Paths
- `reports/evidence/EPOCH-V2-S7-AUDIT/AUDIT_AFTER_SPRINT_7.md`
- `reports/evidence/EPOCH-V2-S7-AUDIT/COMMANDS_EXECUTED.md`
- `reports/evidence/EPOCH-V2-S7-AUDIT/GATE_MATRIX.md`

## VERDICT Template
```
VERDICT: PASS | BLOCKED | FAIL
reason_code: NONE | <code>
first_failing_step: N/A | <step>
ONE_NEXT_ACTION: <command>
```
