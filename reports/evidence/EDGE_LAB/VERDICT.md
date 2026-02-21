# VERDICT.md — EDGE_LAB Final Verdict
generated_at: f545a66795e5
script: edge_all.mjs

## FINAL VERDICT: BLOCKED

## Verdict Reason
Pipeline failed at step: paper:ingest. All subsequent courts were not evaluated.

## Pipeline Results
| sources | PASS |
| registry | PASS |
| profit:candidates | PASS |
| paper:ingest | FAIL |

## Next Steps
1. Fix the failing script: edge:paper:ingest
2. Rerun: npm run edge:all
