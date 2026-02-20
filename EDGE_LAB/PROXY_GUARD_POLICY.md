# PROXY_GUARD_POLICY

## Rule
Any occurrence of `estimated`, `approx`, or `proxy` in EDGE registry is treated as a proxy assumption.

## Fail-closed behavior
- If proxy assumptions are detected and `EDGE_LAB/PROXY_VALIDATION.md` is absent, gate result is `BLOCKED` with `UNVERIFIED_PROXY_ASSUMPTION`.
- If validation doc exists, gate may pass while still listing flagged assumptions.

## Evidence
- `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json`
