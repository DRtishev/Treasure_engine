# E95 ADVERSE SUITE
- MIN_DAYS: 7
- STABILITY_VARIANCE_MAX: 0.0200

| case_id | symbol | days_observed | reject_rate | hold_rate | park_rate | variance | expected | actual | match |
|---|---|---:|---:|---:|---:|---:|---|---|---|
| F_A_REJECT_SPIKE | BETA | 10 | 0.5000 | 0.1000 | 0.0000 | 0.0100 | PARK | PARK | PASS |
| F_B_HOLD_DOMINATION | GAMMA | 10 | 0.1000 | 0.5000 | 0.0000 | 0.0100 | HOLD | HOLD | PASS |
| F_C_PARK_PERSISTENCE | ALPHA | 10 | 0.0000 | 0.2000 | 0.2000 | 0.0100 | PARK | PARK | PASS |
| F_D_INSUFFICIENT_DAYS | DELTA | 5 | 0.0000 | 0.2000 | 0.0000 | 0.0000 | OBSERVE | OBSERVE | PASS |
| F_E_UNSTABLE_VARIANCE | EPSILON | 10 | 0.1000 | 0.1000 | 0.0000 | 0.0900 | HOLD | HOLD | PASS |
| F_P_PROMOTE_BASELINE | ALPHA | 10 | 0.1000 | 0.1000 | 0.0000 | 0.0100 | PROMOTE | PROMOTE | PASS |
- adverse_suite_fingerprint: 3d27012a5dc65f524944465e0d166cd96c561257ec5315c5a10997636a9719ae
