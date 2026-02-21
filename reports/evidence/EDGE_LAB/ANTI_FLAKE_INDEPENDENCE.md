# ANTI_FLAKE_INDEPENDENCE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 413510c72bed
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
| run1 | 4e8273c9cd84e81d19764b126b53e071d187ad43dc3db134a1fb811f7d1e3b5f |
| run2 | 4e8273c9cd84e81d19764b126b53e071d187ad43dc3db134a1fb811f7d1e3b5f |

## File Hash Matrix

| File | SHA256 run1 (prefix) | SHA256 run2 (prefix) | Status |
|------|---------------------|---------------------|--------|
| DATASET_COURT.md | 68a34b22d04e59c4… | 68a34b22d04e59c4… | MATCH |
| EVIDENCE_INDEX.md | ac8eb7b9d36a320b… | ac8eb7b9d36a320b… | MATCH |
| EXECUTION_BREAKPOINTS.md | 8cd7f3563b2704c3… | 8cd7f3563b2704c3… | MATCH |
| EXECUTION_COURT.md | 2beb6a8b2594faa6… | 2beb6a8b2594faa6… | MATCH |
| EXECUTION_DRIFT.md | 97919aa4be815a36… | 97919aa4be815a36… | MATCH |
| EXECUTION_REALITY_COURT.md | db634eff9336e7c0… | db634eff9336e7c0… | MATCH |
| EXECUTION_SENSITIVITY_GRID.md | 51c0c16ffd2c37e1… | 51c0c16ffd2c37e1… | MATCH |
| EXPECTANCY_CI.md | 00c485592c66b8ee… | 00c485592c66b8ee… | MATCH |
| GOVERNANCE_FINGERPRINT.md | 35cd26f1ee011d3e… | 35cd26f1ee011d3e… | MATCH |
| MCL_NOTES.md | 3e96c1b7326069d6… | 3e96c1b7326069d6… | MATCH |
| MEGA_CLOSEOUT_EDGE_LAB.md | 65493e5962c7624b… | 65493e5962c7624b… | MATCH |
| MICRO_LIVE_READINESS.md | 59eee2f7f907dde1… | 59eee2f7f907dde1… | MATCH |
| MICRO_LIVE_SRE.md | e27ab782d2705110… | e27ab782d2705110… | MATCH |
| MULTI_HYPOTHESIS_COURT.md | 8d3d775e93ad61aa… | 8d3d775e93ad61aa… | MATCH |
| OVERFIT_COURT.md | 047a1feb7d97e55a… | 047a1feb7d97e55a… | MATCH |
| PAPER_COURT.md | 32c082e6b73087eb… | 32c082e6b73087eb… | MATCH |
| PAPER_EVIDENCE.md | 54fb97cc49ac9384… | 54fb97cc49ac9384… | MATCH |
| PAPER_EVIDENCE_COURT.md | 5c34dbf80d59b284… | 5c34dbf80d59b284… | MATCH |
| PORTFOLIO_COURT.md | f260ee0abbb981a0… | f260ee0abbb981a0… | MATCH |
| PROFIT_CANDIDATES_COURT.md | cc9deeccec4b7408… | cc9deeccec4b7408… | MATCH |
| REDTEAM_COURT.md | 3882f726d9e20cec… | 3882f726d9e20cec… | MATCH |
| REGISTRY_COURT.md | 0d347dc96269e1d6… | 0d347dc96269e1d6… | MATCH |
| RISK_COURT.md | a0cf6dca34d14c75… | a0cf6dca34d14c75… | MATCH |
| SLI_BASELINE.md | b80f0fe66dcea44f… | b80f0fe66dcea44f… | MATCH |
| SNAPSHOT.md | 89742532b10097bf… | 89742532b10097bf… | MATCH |
| SOURCES_AUDIT.md | f0aaa43e54300166… | f0aaa43e54300166… | MATCH |
| SRE_COURT.md | c75b6ce5c1a0b33c… | c75b6ce5c1a0b33c… | MATCH |
| VERDICT.md | 19c40f921f3563c6… | 19c40f921f3563c6… | MATCH |

## DRIFT_FILES

- NONE

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/anti_flake_independence.json
