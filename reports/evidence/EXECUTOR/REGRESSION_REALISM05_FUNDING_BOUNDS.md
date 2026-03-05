# REGRESSION_REALISM05_FUNDING_BOUNDS.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] no_holding_zero_funding: funding_usd=0, funding_bps=0
- [PASS] holding_default_rate_positive: funding_usd=7.13, funding_bps=15
- [PASS] holding_default_status_bounds: funding_status=BOUNDS_ESTIMATE
- [PASS] known_rate_status: funding_status=KNOWN
- [PASS] known_rate_positive: funding_usd=2.85
- [PASS] oob_rate_insufficient_evidence: funding_status=INSUFFICIENT_EVIDENCE
- [PASS] oob_rate_worst_case: funding_bps=30 (expected 30 = 15*2)
- [PASS] negative_rate_known: funding_status=KNOWN, bps=-3
