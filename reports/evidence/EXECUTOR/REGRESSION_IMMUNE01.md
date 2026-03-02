# REGRESSION_IMMUNE01.md — Immune-Nervous Integration (EPOCH-71)

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:immune01-integration
CHECKS_TOTAL: 7
VIOLATIONS: 0

## CHECKS
- [PASS] doctor_in_telemetry: OK: T6 ops:doctor in TELEMETRY_STEPS
- [PASS] immune_reflex_registered: OK: immune_reflex with DOCTOR_VERDICT_FAIL trigger registered
- [PASS] guard_probe_failure_reads_evidence: OK: guard_probe_failure reads EPOCH-DOCTOR receipt
- [PASS] guard_healable_checks_conditions: OK: guard_healable checks doctor_verdict context
- [PASS] guard_heal_complete_reads_receipt: OK: guard_heal_complete reads HEAL_RECEIPT
- [PASS] life_summary_immune_field: skip-safe PASS — LIFE_SUMMARY schema=2.0.0 (pre-v3)
- [PASS] heal_runner_exists: OK: scripts/ops/heal_runner.mjs exists

## FAILED
- NONE
