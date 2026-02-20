# MICRO_LIVE_READINESS.md — Micro-Live Readiness Assessment
generated_at: RUN_ID
script: edge_micro_live_readiness.mjs

## STATUS: NEEDS_DATA

## Eligibility Matrix
| State | Value |
|-------|-------|
| ELIGIBLE_FOR_PAPER | true |
| ELIGIBLE_FOR_MICRO_LIVE | false |
| ELIGIBLE_FOR_LIVE | false |

## Gate Prerequisite Checks
| Gate | Required | Actual | Result | Reason |
|------|---------|--------|--------|--------|
| PROFIT_CANDIDATES_COURT | PASS | PASS | PASS | NONE |
| EXECUTION_REALITY_COURT | PASS | NEEDS_DATA | BLOCKED | PROXY_EXPECTANCY_UNVALIDATED |
| SLI_BASELINE | PASS | MISSING | BLOCKED | FILE_NOT_FOUND |
| PROXY_GUARD | PASS | MISSING | BLOCKED | FILE_NOT_FOUND |
| PAPER_COURT | PASS | MISSING | BLOCKED | FILE_NOT_FOUND |

## Protocol Checks (PAPER_TO_MICRO_LIVE_PROTOCOL.md)
| Required Field | Found |
|---------------|-------|
| stop_rules_section | FOUND |
| minimum capital | FOUND |
| risk limit | FOUND |
| stop | FOUND |
| SLI | FOUND |

## Blocked Reasons
- Gate EXECUTION_REALITY_COURT: expected PASS, got NEEDS_DATA (PROXY_EXPECTANCY_UNVALIDATED)
- Gate SLI_BASELINE: expected PASS, got MISSING (FILE_NOT_FOUND)
- Gate PROXY_GUARD: expected PASS, got MISSING (FILE_NOT_FOUND)
- Gate PAPER_COURT: expected PASS, got MISSING (FILE_NOT_FOUND)

## Verdict
MICRO_LIVE_ELIGIBLE: **false**
LIVE_ELIGIBLE: **false** (permanent false — requires explicit policy upgrade)

NEXT_ACTION: Pass gates: EXECUTION_REALITY_COURT, SLI_BASELINE, PROXY_GUARD, PAPER_COURT. Then rerun edge:all.
