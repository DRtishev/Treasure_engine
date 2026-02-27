# FIXTURE_GUARD_GATE.md — FG01 Fixture Guard

STATUS: PASS
REASON_CODE: NONE
RUN_ID: aad548e5e739
ALLOW_FIXTURES: unset
ELIGIBLE_FOR_MICRO_LIVE: true
ELIGIBLE_FOR_EXECUTION: true
NEXT_ACTION: Fixture guard satisfied. Eligibility not blocked by FG01.

## FG01 Policy

Default mode: REAL_ONLY — evidence sources must be real (not fixtures).
Fixture opt-in: Set ALLOW_FIXTURES=1 (tests only).
Enforcement: If evidence source is fixture AND ALLOW_FIXTURES!=1 => BLOCKED FG01.
Eligibility flags remain false under any fixture violation.

## Violations

| Path | Field | Value | Status |
|------|-------|-------|--------|
| (none) | — | — | CLEAN |

## Scanned Files (sample, max 20 of 23)

| Path | Check | Result |
|------|-------|--------|
| `reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | FILENAME_OK | CLEAN |
| `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | FILENAME_OK | CLEAN |
| `reports/evidence/INFRA_P0/gates/manual/dep02_failclosed_readiness.json` | FILENAME_OK | CLEAN |
| `reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json` | FILENAME_OK | CLEAN |
| `reports/evidence/INFRA_P0/gates/manual/format_policy_gate.json` | FILENAME_OK | CLEAN |
| `reports/evidence/INFRA_P0/gates/manual/goldens_apply_gate.json` | FILENAME_OK | CLEAN |
| `reports/evidence/INFRA_P0/gates/manual/infra_p0_final.json` | FILENAME_OK | CLEAN |

## Summary

| Metric | Value |
|--------|-------|
| Files scanned | 23 |
| Violations found | 0 |
| ALLOW_FIXTURES | unset |
| Gate status | PASS |

## Evidence Paths

- reports/evidence/INFRA_P0/FIXTURE_GUARD_GATE.md
- reports/evidence/INFRA_P0/gates/manual/fixture_guard_gate.json
