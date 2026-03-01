# REGRESSION_RG_NET_UNLOCK03.md — CERT Refuses With Allow File

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 87a85d3c62f3
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] unlock01_checks_allow_network: regression_unlock01 checks ALLOW_NETWORK — OK
- [PASS] unlock01_fails_if_allow_present: unlock01 fails if ALLOW_NETWORK present — OK
- [PASS] verify_fast_includes_unlock01: unlock01 in verify:fast — OK
- [PASS] unlock01_before_heavy_gates: unlock01 positioned before byte-audit — OK
- [PASS] life_hard_stops_on_verify_fast_fail: hard_stop on verify_fast in life.mjs — OK
- [PASS] allow_network_absent_in_cert: ALLOW_NETWORK absent — CERT state clean — OK

## FAILED
- NONE
