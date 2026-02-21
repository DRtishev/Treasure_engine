# ANTI_FLAKE_INDEPENDENCE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3444ae7de207
NEXT_ACTION: Proceed. edge:all is verified deterministic.

## Methodology

Runs edge:all (producer pipeline) twice consecutively.
Each run wipes EVIDENCE_DIR and rebuilds all court outputs.
After each run: applies stableEvidenceNormalize() to all .md files, then SHA256-fingerprints all files.
Compares fingerprints between run1 and run2.
This check is INDEPENDENT of edge:next-epoch readiness gates.

## Fingerprints

| Run | Fingerprint |
|-----|-------------|
| run1 | 220ca60b8d2ac3bc627f71e3aba4a9181a99f09eab7e7acac3a2c7b39ed83809 |
| run2 | 220ca60b8d2ac3bc627f71e3aba4a9181a99f09eab7e7acac3a2c7b39ed83809 |

## File Hash Matrix

| File | SHA256 run1 (prefix) | SHA256 run2 (prefix) | Status |
|------|---------------------|---------------------|--------|
| DATASET_COURT.md | e17276a622c852df… | e17276a622c852df… | MATCH |
| EVIDENCE_INDEX.md | e81da56008ee97d2… | e81da56008ee97d2… | MATCH |
| EXECUTION_BREAKPOINTS.md | c5d67e61e6373831… | c5d67e61e6373831… | MATCH |
| EXECUTION_COURT.md | c142fff57e515a64… | c142fff57e515a64… | MATCH |
| EXECUTION_REALITY_COURT.md | 15db173ac097536b… | 15db173ac097536b… | MATCH |
| EXECUTION_SENSITIVITY_GRID.md | 4f4db6f1c0984d0a… | 4f4db6f1c0984d0a… | MATCH |
| EXPECTANCY_CI.md | 4e780448646b2894… | 4e780448646b2894… | MATCH |
| GOVERNANCE_FINGERPRINT.md | 56d56dc32945ea2c… | 56d56dc32945ea2c… | MATCH |
| MCL_NOTES.md | 74041e4912ed09b6… | 74041e4912ed09b6… | MATCH |
| MEGA_CLOSEOUT_EDGE_LAB.md | 43807f1ee2829508… | 43807f1ee2829508… | MATCH |
| MICRO_LIVE_READINESS.md | e11db734b79a6b39… | e11db734b79a6b39… | MATCH |
| OVERFIT_COURT.md | db884c772aa7e382… | db884c772aa7e382… | MATCH |
| PAPER_EVIDENCE.md | e76124c29e906c95… | e76124c29e906c95… | MATCH |
| PAPER_EVIDENCE_COURT.md | 81fb3b953d1b8ddb… | 81fb3b953d1b8ddb… | MATCH |
| PROFIT_CANDIDATES_COURT.md | 345c773812df0385… | 345c773812df0385… | MATCH |
| REDTEAM_COURT.md | 4a6656e2551f9fb9… | 4a6656e2551f9fb9… | MATCH |
| REGISTRY_COURT.md | 445d9d5b5809e945… | 445d9d5b5809e945… | MATCH |
| RISK_COURT.md | 10d0907319d8c0c0… | 10d0907319d8c0c0… | MATCH |
| SNAPSHOT.md | 3aeab559ef9ceac3… | 3aeab559ef9ceac3… | MATCH |
| SOURCES_AUDIT.md | c547d2fbab01c3f3… | c547d2fbab01c3f3… | MATCH |
| SRE_COURT.md | 902d1f3042ead634… | 902d1f3042ead634… | MATCH |
| VERDICT.md | dd19a836b409d627… | dd19a836b409d627… | MATCH |

## DRIFT_FILES

- NONE

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/anti_flake_independence.json
