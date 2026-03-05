# RG_ATTRIBUTION_E2E01: PnL Attribution E2E

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
CHECKS: 5
VIOLATIONS: 0

- [PASS] attribution_has_4_components: OK: fees=0.08, slip=0.09999999999999432, funding=0.05, edge=1.0899999999999999
- [PASS] funding_sum_correct: OK: total_funding=0.05
- [PASS] summary_has_total_funding: OK: summary.total_funding=0.05
- [PASS] fees_sum_correct: OK: fees=0.08
- [PASS] edge_pnl_positive: OK: edge_pnl=1.0899999999999999
