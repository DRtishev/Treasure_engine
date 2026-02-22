# CALM_P0_ANTI_FLAKE_X2.md — Calm P0 Determinism Verification

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 2c52a286482d
NEXT_ACTION: Proceed to npm run edge:micro:live:readiness.

## Methodology

Runs edge:calm:p0 (CANON_SELFTEST → DATA_COURT → EVIDENCE_HASHES → RECEIPTS_CHAIN) twice.
After each run, reads CHECKSUMS.md and extracts SCOPE_MANIFEST_SHA + sorted sha256_norm rows.
Computes fingerprint = sha256_norm(SCOPE_MANIFEST_SHA + sorted_sha256_norm_rows).
Compares fingerprints: mismatch => FAIL ND01.

## Fingerprints

| Run | Fingerprint | scope_manifest_sha (prefix) | norm_rows |
|-----|-------------|----------------------------|-----------|
| run1 | 51d53ea00cf107e065fcabfb51b6f9cc19865522352ef83f6c20cc82f9cbd189 | 0b75f6c15507133c… | 96 |
| run2 | 51d53ea00cf107e065fcabfb51b6f9cc19865522352ef83f6c20cc82f9cbd189 | 0b75f6c15507133c… | 96 |

## Fingerprint Match

MATCH: YES

## SHA256_NORM Row Sample (Run 1, first 5)

  - 1f1334d42190915eb2c5c8e5…
  - 6413adbce60c222f3ddbdec9…
  - 0dc429f5041c59763ee387e8…
  - d58e82f882583db6c098e6fc…
  - 361437d67d4926ea8f70f3ce…

## SHA256_NORM Row Sample (Run 2, first 5)

  - 1f1334d42190915eb2c5c8e5…
  - 6413adbce60c222f3ddbdec9…
  - 0dc429f5041c59763ee387e8…
  - d58e82f882583db6c098e6fc…
  - 361437d67d4926ea8f70f3ce…

## Drift Details

NO DRIFT — all sha256_norm rows identical across both runs.

## Verdicts

| Gate | Status |
|------|--------|
| CALM_P0_RUN1 | PASS |
| CALM_P0_RUN2 | PASS |
| FINGERPRINT_MATCH | PASS |

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md
- reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json
- reports/evidence/EDGE_LAB/P0/CHECKSUMS.md (source of fingerprint)
