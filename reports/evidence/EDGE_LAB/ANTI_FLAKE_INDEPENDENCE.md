# ANTI_FLAKE_INDEPENDENCE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 779042cd2846
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
| run1 | 555a12a5c5e122e7538a7905ff165957fb0671b25907ab908b024c1a298eabf9 |
| run2 | 555a12a5c5e122e7538a7905ff165957fb0671b25907ab908b024c1a298eabf9 |

## File Hash Matrix

| File | SHA256 run1 (prefix) | SHA256 run2 (prefix) | Status |
|------|---------------------|---------------------|--------|
| DATASET_COURT.md | b7fb1d3fdc45fab0… | b7fb1d3fdc45fab0… | MATCH |
| EVIDENCE_INDEX.md | ab28ba7f217e4792… | ab28ba7f217e4792… | MATCH |
| EXECUTION_BREAKPOINTS.md | 730909b48fd6096e… | 730909b48fd6096e… | MATCH |
| EXECUTION_COURT.md | e5b1867420b9f980… | e5b1867420b9f980… | MATCH |
| EXECUTION_DRIFT.md | 97919aa4be815a36… | 97919aa4be815a36… | MATCH |
| EXECUTION_REALITY_COURT.md | dc5f037741314d4b… | dc5f037741314d4b… | MATCH |
| EXECUTION_SENSITIVITY_GRID.md | d7377e093ccc46a9… | d7377e093ccc46a9… | MATCH |
| EXPECTANCY_CI.md | 41bf0f1da5320b9f… | 41bf0f1da5320b9f… | MATCH |
| GOVERNANCE_FINGERPRINT.md | 62a235e3f1e07bc6… | 62a235e3f1e07bc6… | MATCH |
| MCL_NOTES.md | 821d846c6bea66f9… | 821d846c6bea66f9… | MATCH |
| MEGA_CLOSEOUT_EDGE_LAB.md | 51581147008d4bed… | 51581147008d4bed… | MATCH |
| MICRO_LIVE_READINESS.md | 04f812291c4eaaa5… | 04f812291c4eaaa5… | MATCH |
| MICRO_LIVE_SRE.md | 47fcb60c98beb5b0… | 47fcb60c98beb5b0… | MATCH |
| MULTI_HYPOTHESIS_COURT.md | bebcca59fc1b835d… | bebcca59fc1b835d… | MATCH |
| OVERFIT_COURT.md | cf999c65c52c65e9… | cf999c65c52c65e9… | MATCH |
| PAPER_COURT.md | 32c082e6b73087eb… | 32c082e6b73087eb… | MATCH |
| PAPER_EVIDENCE.md | e7554fad5ed145b3… | e7554fad5ed145b3… | MATCH |
| PAPER_EVIDENCE_COURT.md | a9d4391a9e2f6108… | a9d4391a9e2f6108… | MATCH |
| PROFIT_CANDIDATES_COURT.md | b9fc709972a62122… | b9fc709972a62122… | MATCH |
| REDTEAM_COURT.md | 7748107547da27d4… | 7748107547da27d4… | MATCH |
| REGISTRY_COURT.md | 7fbc0788ff96164c… | 7fbc0788ff96164c… | MATCH |
| RISK_COURT.md | 9a882eebc974b546… | 9a882eebc974b546… | MATCH |
| SLI_BASELINE.md | b80f0fe66dcea44f… | b80f0fe66dcea44f… | MATCH |
| SNAPSHOT.md | 14175c4af632e034… | 14175c4af632e034… | MATCH |
| SOURCES_AUDIT.md | 66ef068ec3bc987d… | 66ef068ec3bc987d… | MATCH |
| SRE_COURT.md | 4bd5842898a175a7… | 4bd5842898a175a7… | MATCH |
| VERDICT.md | 111d43e7cdca802b… | 111d43e7cdca802b… | MATCH |

## DRIFT_FILES

- NONE

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/anti_flake_independence.json
