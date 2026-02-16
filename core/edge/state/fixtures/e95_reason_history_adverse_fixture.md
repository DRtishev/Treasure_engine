# E95 Adverse Reason History Fixture

| case_id | symbol | days_observed | rejects_count | holds_count | parks_count | variance_proxy | expected_decision |
|---|---|---:|---:|---:|---:|---:|---|
| F_A_REJECT_SPIKE | BETA | 10 | 5 | 1 | 0 | 0.0100 | PARK |
| F_B_HOLD_DOMINATION | GAMMA | 10 | 1 | 5 | 0 | 0.0100 | HOLD |
| F_C_PARK_PERSISTENCE | ALPHA | 10 | 0 | 2 | 2 | 0.0100 | PARK |
| F_D_INSUFFICIENT_DAYS | DELTA | 5 | 0 | 1 | 0 | 0.0000 | OBSERVE |
| F_E_UNSTABLE_VARIANCE | EPSILON | 10 | 1 | 1 | 0 | 0.0900 | HOLD |
| F_P_PROMOTE_BASELINE | ALPHA | 10 | 1 | 1 | 0 | 0.0100 | PROMOTE |
