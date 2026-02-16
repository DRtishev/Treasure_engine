# E96 ADVERSARIAL SUITE
| case_id | symbol | tier | days_observed | reject_rate | hold_rate | park_rate | variance | expected | actual | reason_code | match |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|---|
| G1_DROPOUT_RETURN | ALPHA | T1 | 10 | 0.1000 | 0.2000 | 0.0000 | 0.0100 | PROMOTE | PROMOTE | OK | PASS |
| G2_OUT_OF_ORDER | BETA | T0 | 10 | 0.2200 | 0.1000 | 0.0000 | 0.0100 | PARK | PARK | RATE_CAP_EXCEEDED | PASS |
| G3_UTC_BOUNDARY | GAMMA | T1 | 10 | 0.1000 | 0.3500 | 0.0000 | 0.0100 | HOLD | HOLD | HOLD_RATE_HIGH | PASS |
| G4_MIXED_CADENCE | DELTA | T2 | 3 | 0.0000 | 0.1000 | 0.0000 | 0.0000 | OBSERVE | OBSERVE | INSUFFICIENT_DAYS | PASS |
| G5_VARIANCE_TRAP | EPSILON | T1 | 10 | 0.1000 | 0.1000 | 0.0000 | 0.0900 | HOLD | HOLD | UNSTABLE_VARIANCE | PASS |
| G6_ACTIVE_PARK | ZETA | T1 | 10 | 0.0500 | 0.1000 | 0.1000 | 0.0100 | PARK | PARK | ACTIVE_PARK | PASS |
- adversarial_fingerprint: 34ffe847047d6d9d753d9f84565b3f9b1aae760aab34fec75d7b91fcea26dc0a
