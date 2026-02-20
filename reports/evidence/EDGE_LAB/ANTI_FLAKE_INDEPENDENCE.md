# ANTI_FLAKE_INDEPENDENCE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 489d15cd3198
NEXT_ACTION: Proceed. edge:all is verified deterministic.

## Methodology

Runs edge:all (producer pipeline) twice consecutively via DETERMINISM_X2 internal check.
This file is the COURT_MANIFEST contract artifact for anti-flake independence.
For standalone verification, run: npm run edge:all:x2

## Fingerprints

| Run | Fingerprint |
|-----|-------------|
| run1 | 3ff7307dfa9bbe12897382e14e5b440183feddf90916d454092ece68ee163ea1 |
| run2 | 3ff7307dfa9bbe12897382e14e5b440183feddf90916d454092ece68ee163ea1 |

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/anti_flake_independence.json
- reports/evidence/EDGE_LAB/gates/manual/determinism_x2.json
