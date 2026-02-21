# ANTI_FLAKE_INDEPENDENCE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 53c0662f592b
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
| run1 | 6c7ea7087010d9cf891fac305cfa979414fc39d16accf152ed0724af794fc89c |
| run2 | 6c7ea7087010d9cf891fac305cfa979414fc39d16accf152ed0724af794fc89c |

## File Hash Matrix

| File | SHA256 run1 (prefix) | SHA256 run2 (prefix) | Status |
|------|---------------------|---------------------|--------|
| DATASET_COURT.md | 064ffad80af894b7… | 064ffad80af894b7… | MATCH |
| EVIDENCE_INDEX.md | 653ae88cf00d6528… | 653ae88cf00d6528… | MATCH |
| EXECUTION_BREAKPOINTS.md | a58f0a6be82dc62c… | a58f0a6be82dc62c… | MATCH |
| EXECUTION_COURT.md | 347a0756dc5da002… | 347a0756dc5da002… | MATCH |
| EXECUTION_REALITY_COURT.md | 34f7e1e8d863f720… | 34f7e1e8d863f720… | MATCH |
| EXECUTION_SENSITIVITY_GRID.md | 659ebf9fa92971e0… | 659ebf9fa92971e0… | MATCH |
| GOVERNANCE_FINGERPRINT.md | 20a55dacb6a1eca0… | 20a55dacb6a1eca0… | MATCH |
| MCL_NOTES.md | 6f5ae52d28c8af00… | 6f5ae52d28c8af00… | MATCH |
| MEGA_CLOSEOUT_EDGE_LAB.md | c9bc915d17de8773… | c9bc915d17de8773… | MATCH |
| MICRO_LIVE_READINESS.md | 8f792c9c4188acf4… | 8f792c9c4188acf4… | MATCH |
| OVERFIT_COURT.md | 59e9f46877d66158… | 59e9f46877d66158… | MATCH |
| PAPER_EVIDENCE.md | 0cafa662d0e303b5… | 0cafa662d0e303b5… | MATCH |
| PAPER_EVIDENCE_COURT.md | 752957865a3cdb1d… | 752957865a3cdb1d… | MATCH |
| PROFIT_CANDIDATES_COURT.md | 218cc86727ed6609… | 218cc86727ed6609… | MATCH |
| REDTEAM_COURT.md | 542a7c693b8a6d8c… | 542a7c693b8a6d8c… | MATCH |
| REGISTRY_COURT.md | 9b9bf0df5e65fb0e… | 9b9bf0df5e65fb0e… | MATCH |
| RISK_COURT.md | d5c5023bc3cef99a… | d5c5023bc3cef99a… | MATCH |
| SNAPSHOT.md | 0c240d7d4ed3d52b… | 0c240d7d4ed3d52b… | MATCH |
| SOURCES_AUDIT.md | f5b0083c7a5e03a6… | f5b0083c7a5e03a6… | MATCH |
| SRE_COURT.md | 7301cc01c3c0239c… | 7301cc01c3c0239c… | MATCH |
| VERDICT.md | bb061fdbaf038f73… | bb061fdbaf038f73… | MATCH |

## DRIFT_FILES

- NONE

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/anti_flake_independence.json
