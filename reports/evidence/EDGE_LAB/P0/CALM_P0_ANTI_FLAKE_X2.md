# CALM_P0_ANTI_FLAKE_X2.md — Calm P0 Determinism Verification

STATUS: FAIL
REASON_CODE: ND01
RUN_ID: cad9c4ea3904
NEXT_ACTION: Investigate nondeterministic evidence outputs. Fix drift before proceeding. Rerun edge:calm:p0:x2 to verify.

## Methodology

Runs edge:calm:p0 (CANON_SELFTEST → DATA_COURT → EVIDENCE_HASHES → RECEIPTS_CHAIN) twice.
After each run, reads CHECKSUMS.md and extracts SCOPE_MANIFEST_SHA + sorted sha256_norm rows.
Computes fingerprint = sha256_norm(SCOPE_MANIFEST_SHA + sorted_sha256_norm_rows).
Compares fingerprints: mismatch => FAIL ND01.

## Fingerprints

| Run | Fingerprint | scope_manifest_sha (prefix) | norm_rows |
|-----|-------------|----------------------------|-----------|
| run1 | 8952900bf9dbe171d80140c88bb829556d92f5861bdac4bb0493e795dc40db88 | 606837aeb57be66a… | 98 |
| run2 | 2bcf4f7a85f8125dd11a62e146b7e584c76aae9591fdda36da9280a4fbfc16d8 | 606837aeb57be66a… | 98 |

## Fingerprint Match

MATCH: NO

## SHA256_NORM Row Sample (Run 1, first 5)

  - 021ba0511726a903c5d184a5…
  - 0697ca09284253581bd5bb4a…
  - 0cbb83e53e415b157294b92a…
  - 0dc429f5041c59763ee387e8…
  - 0f5bfdecbb78de62b8a07287…

## SHA256_NORM Row Sample (Run 2, first 5)

  - 021ba0511726a903c5d184a5…
  - 0697ca09284253581bd5bb4a…
  - 0cbb83e53e415b157294b92a…
  - 0dc429f5041c59763ee387e8…
  - 0f5bfdecbb78de62b8a07287…

## Drift Details

Rows only in run1: 3
Rows only in run2: 3

## Verdicts

| Gate | Status |
|------|--------|
| CALM_P0_RUN1 | PASS |
| CALM_P0_RUN2 | PASS |
| FINGERPRINT_MATCH | FAIL ND01 |

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md
- reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json
- reports/evidence/EDGE_LAB/P0/CHECKSUMS.md (source of fingerprint)
