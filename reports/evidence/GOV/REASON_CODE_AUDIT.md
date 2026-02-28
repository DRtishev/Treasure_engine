# REASON_CODE_AUDIT.md — Reason Code SSOT Collision Audit

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 4d08f3b36857
NEXT_ACTION: No reason code violations. Proceed with gov:integrity.

## Audit Policy

All gate JSON reason_code fields must use codes from the SSOT list.
- D003: RESERVED — canon/governance drift only (allowlist: CANON_SELFTEST, FORMAT_POLICY)
- NEEDS_DATA: only NDA01 or NDA02 (strict stderr signatures) or DC90 (data court)
- PASS status with blocking reason codes: flagged as inconsistency

## Violations

| Path | Reason Code | Status | Violation |
|------|-------------|--------|-----------|
| (none) | — | — | CLEAN |

## Scanned Files (first 30 of 42)

| File | Reason Code | Status | Check |
|------|-------------|--------|-------|
| `dep02_failclosed_readiness.json` | NONE | PASS | OK |
| `deps_offline_install.json` | NONE | PASS | OK |
| `fixture_guard_gate.json` | NONE | PASS | OK |
| `format_policy_gate.json` | NONE | PASS | OK |
| `goldens_apply_gate.json` | NONE | PASS | OK |
| `infra_p0_closeout.json` | NONE | PASS | OK |
| `infra_p0_commands.json` | NONE | PASS | OK |
| `infra_p0_final.json` | NONE | PASS | OK |
| `net_isolation.json` | NONE | PASS | OK |
| `node_truth_gate.json` | NONE | PASS | OK |
| `verify_mode_gate.json` | NONE | PASS | OK |
| `calm_p0_final.json` | NONE | PASS | OK |
| `calm_p0_x2.json` | NONE | PASS | OK |
| `canon_selftest.json` | NONE | PASS | OK |
| `execution_reality_court.json` | NONE | PASS | OK |
| `expectancy_ci.json` | NONE | PASS | OK |
| `micro_live_readiness.json` | DEP02 | BLOCKED | OK |
| `micro_live_sre.json` | NONE | PASS | OK |
| `multi_hypothesis_court.json` | NONE | PASS | OK |
| `paper_court.json` | NONE | PASS | OK |
| `paper_evidence.json` | NONE | PASS | OK |
| `paper_evidence_court.json` | NONE | PASS | OK |
| `portfolio_court.json` | NONE | PASS | OK |
| `profit_candidates_court.json` | NONE | PASS | OK |
| `proxy_guard.json` | NONE | PASS | OK |
| `sli_baseline.json` | NONE | PASS | OK |
| `netv01_probe.json` | NONE | PASS | OK |
| `op01_scripts_check.json` | NONE | PASS | OK |
| `regression_net_kill_preload_hard.json` | NONE | PASS | OK |
| `regression_net_kill_preload_path_safe.json` | NONE | PASS | OK |

## Summary

| Metric | Value |
|--------|-------|
| Files scanned | 42 |
| Hard violations | 0 |
| Unknown code warnings | 0 |
| D003 violations | 0 |
| NEEDS_DATA abuse | 0 |

## Evidence Paths

- reports/evidence/GOV/REASON_CODE_AUDIT.md
- reports/evidence/GOV/gates/manual/reason_code_audit.json
