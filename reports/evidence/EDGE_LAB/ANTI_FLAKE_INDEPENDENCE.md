# ANTI_FLAKE_INDEPENDENCE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 295c8a87115b
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
| run1 | 34b47ef6628c11b90da791656812192723a9301801ce91cc5802489d57832fcb |
| run2 | 34b47ef6628c11b90da791656812192723a9301801ce91cc5802489d57832fcb |

## File Hash Matrix

| File | SHA256 run1 (prefix) | SHA256 run2 (prefix) | Status |
|------|---------------------|---------------------|--------|
| DATASET_COURT.md | 9ab222feaf8df340… | 9ab222feaf8df340… | MATCH |
| EVIDENCE_INDEX.md | 2e27e1958c69fb22… | 2e27e1958c69fb22… | MATCH |
| EXECUTION_BREAKPOINTS.md | 3fcca4d9db7a9f04… | 3fcca4d9db7a9f04… | MATCH |
| EXECUTION_COURT.md | d1eb4aa48564482e… | d1eb4aa48564482e… | MATCH |
| EXECUTION_DRIFT.md | 97919aa4be815a36… | 97919aa4be815a36… | MATCH |
| EXECUTION_REALITY_COURT.md | 45cc65c26a5c53c5… | 45cc65c26a5c53c5… | MATCH |
| EXECUTION_SENSITIVITY_GRID.md | b79052cfd052f162… | b79052cfd052f162… | MATCH |
| EXPECTANCY_CI.md | f1d861b60b88db83… | f1d861b60b88db83… | MATCH |
| GOVERNANCE_FINGERPRINT.md | e400e637ab36509b… | e400e637ab36509b… | MATCH |
| MCL_NOTES.md | 0252671a7a813a75… | 0252671a7a813a75… | MATCH |
| MEGA_CLOSEOUT_EDGE_LAB.md | f54378e6bc8507de… | f54378e6bc8507de… | MATCH |
| MICRO_LIVE_READINESS.md | 2984262151b4af82… | 2984262151b4af82… | MATCH |
| MICRO_LIVE_SRE.md | 76e487b9544104ab… | 76e487b9544104ab… | MATCH |
| OVERFIT_COURT.md | 5dda3dbfc17c897b… | 5dda3dbfc17c897b… | MATCH |
| PAPER_COURT.md | 32c082e6b73087eb… | 32c082e6b73087eb… | MATCH |
| PAPER_EVIDENCE.md | 7d6ccbdf0ac3d2c9… | 7d6ccbdf0ac3d2c9… | MATCH |
| PAPER_EVIDENCE_COURT.md | 8fa3f4be884e11c1… | 8fa3f4be884e11c1… | MATCH |
| PROFIT_CANDIDATES_COURT.md | c6f30444baeabeb6… | c6f30444baeabeb6… | MATCH |
| REDTEAM_COURT.md | 2841ab6fda859248… | 2841ab6fda859248… | MATCH |
| REGISTRY_COURT.md | 4fc8ebe3139b5672… | 4fc8ebe3139b5672… | MATCH |
| RISK_COURT.md | a2e52d42239621ea… | a2e52d42239621ea… | MATCH |
| SLI_BASELINE.md | b80f0fe66dcea44f… | b80f0fe66dcea44f… | MATCH |
| SNAPSHOT.md | 2f32deb347ab56ad… | 2f32deb347ab56ad… | MATCH |
| SOURCES_AUDIT.md | 93481df30c55f282… | 93481df30c55f282… | MATCH |
| SRE_COURT.md | d75cfb7613896293… | d75cfb7613896293… | MATCH |
| VERDICT.md | d6525cda568b8aee… | d6525cda568b8aee… | MATCH |

## DRIFT_FILES

- NONE

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/anti_flake_independence.json
