# E96 Tiered Risk Envelopes

- policy_version: E96.1
- default_tier: T1

## Tier caps

| tier | min_days | reject_rate_max | hold_rate_max | park_rate_max | stability_variance_max |
|---|---:|---:|---:|---:|---:|
| T0 | 7 | 0.1000 | 0.2000 | 0.0500 | 0.0100 |
| T1 | 7 | 0.2000 | 0.3000 | 0.1000 | 0.0200 |
| T2 | 10 | 0.2500 | 0.4000 | 0.1500 | 0.0300 |
| T3 | 14 | 0.3000 | 0.5000 | 0.2000 | 0.0500 |

## Per-symbol tier overrides

| symbol | tier |
|---|---|
| ALPHA | T1 |
| BETA | T0 |
| GAMMA | T1 |
| DELTA | T2 |
| EPSILON | T1 |
| ZETA | T1 |
