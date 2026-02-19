# E137 OFFLINE MATRIX
- reason_code: OK
- verify_e135_ec: 0
Declare: offline transport truth derives from E135 deterministic harness.
Verify: run npm -s run verify:e135 and read reports/evidence/E135/TRANSPORT_HARNESS_MATRIX.md.
If mismatch: tighten wrapper parsing and rerun verify:e135.
## Scenario Matrix
| scenario | reason_code |
|---|---|
| direct_http | OK |
| direct_ws | OK |
| proxy_http_connect | OK |
| proxy_ws_connect | OK |
