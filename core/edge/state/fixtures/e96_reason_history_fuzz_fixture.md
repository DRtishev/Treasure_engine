# E96 Reason History Fuzz Fixture

| case_id | symbol | tier | days_observed | reject_rate | hold_rate | park_rate | variance | active_park | expected_decision |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| G1_DROPOUT_RETURN | ALPHA | T1 | 10 | 0.1000 | 0.2000 | 0.0000 | 0.0100 | false | PROMOTE |
| G2_OUT_OF_ORDER | BETA | T0 | 10 | 0.2200 | 0.1000 | 0.0000 | 0.0100 | false | PARK |
| G3_UTC_BOUNDARY | GAMMA | T1 | 10 | 0.1000 | 0.3500 | 0.0000 | 0.0100 | false | HOLD |
| G4_MIXED_CADENCE | DELTA | T2 | 3 | 0.0000 | 0.1000 | 0.0000 | 0.0000 | false | OBSERVE |
| G5_VARIANCE_TRAP | EPSILON | T1 | 10 | 0.1000 | 0.1000 | 0.0000 | 0.0900 | false | HOLD |
| G6_ACTIVE_PARK | ZETA | T1 | 10 | 0.0500 | 0.1000 | 0.1000 | 0.0100 | true | PARK |
