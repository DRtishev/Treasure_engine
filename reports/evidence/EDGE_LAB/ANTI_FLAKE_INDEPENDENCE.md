# ANTI_FLAKE_INDEPENDENCE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 88fd2c328fa8
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
| run1 | 90c608572750939e299b2db0f503fc141887c9ec994689a27ddea3e49594a62e |
| run2 | 90c608572750939e299b2db0f503fc141887c9ec994689a27ddea3e49594a62e |

## File Hash Matrix

| File | SHA256 run1 (prefix) | SHA256 run2 (prefix) | Status |
|------|---------------------|---------------------|--------|
| DATASET_COURT.md | 29afc9ba50cdf21a… | 29afc9ba50cdf21a… | MATCH |
| EVIDENCE_INDEX.md | 9a2d9c24084fe520… | 9a2d9c24084fe520… | MATCH |
| EXECUTION_BREAKPOINTS.md | ae967aaa384f9a8a… | ae967aaa384f9a8a… | MATCH |
| EXECUTION_COURT.md | 724e5a05e172ca22… | 724e5a05e172ca22… | MATCH |
| EXECUTION_REALITY_COURT.md | f1a3f3fad6bc575f… | f1a3f3fad6bc575f… | MATCH |
| EXECUTION_SENSITIVITY_GRID.md | f8fb727639b3c20c… | f8fb727639b3c20c… | MATCH |
| GOVERNANCE_FINGERPRINT.md | 37ed95eab5551d2a… | 37ed95eab5551d2a… | MATCH |
| MCL_NOTES.md | acd982b7ae97f290… | acd982b7ae97f290… | MATCH |
| MEGA_CLOSEOUT_EDGE_LAB.md | bfe6345913bf72bf… | bfe6345913bf72bf… | MATCH |
| MICRO_LIVE_READINESS.md | e07703bb57128c21… | e07703bb57128c21… | MATCH |
| OVERFIT_COURT.md | 562dea67b0a2781c… | 562dea67b0a2781c… | MATCH |
| PAPER_EVIDENCE.md | 6d4ec7d7aaf6969c… | 6d4ec7d7aaf6969c… | MATCH |
| PROFIT_CANDIDATES_COURT.md | 39fc21beb3e5d56f… | 39fc21beb3e5d56f… | MATCH |
| REDTEAM_COURT.md | 0284b36d5cf5d2d5… | 0284b36d5cf5d2d5… | MATCH |
| REGISTRY_COURT.md | a4d027aee0e727a7… | a4d027aee0e727a7… | MATCH |
| RISK_COURT.md | 37757c0cf17ac7fd… | 37757c0cf17ac7fd… | MATCH |
| SNAPSHOT.md | 4e96a6848967e79c… | 4e96a6848967e79c… | MATCH |
| SOURCES_AUDIT.md | 6f2a070796bf5411… | 6f2a070796bf5411… | MATCH |
| SRE_COURT.md | ea39ef7713b8fea5… | ea39ef7713b8fea5… | MATCH |
| VERDICT.md | f45b4f0a78caa86b… | f45b4f0a78caa86b… | MATCH |

## DRIFT_FILES

- NONE

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/anti_flake_independence.json
