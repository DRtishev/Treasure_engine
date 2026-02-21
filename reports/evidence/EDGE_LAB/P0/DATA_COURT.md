# DATA_COURT.md — P0 Data Source Court

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3d37e68311e2
NEXT_ACTION: No action required. Data source is confirmed.

## Configuration

| Setting | Value |
|---------|-------|
| DATA_SOURCE_MODE | SINGLE_SOURCE (default) |
| DATA_SOURCE_CONFIRMED | not set |
| policy_present | true |

## Detected Data Directories

| Directory | Status |
|-----------|--------|
| `artifacts/incoming` | PRESENT |
| `data/fixtures` | PRESENT |
| `data/raw` | PRESENT |
| `data/normalized` | PRESENT |

## Paper Evidence Files

| File | sha256_norm (prefix) |
|------|---------------------|
| `artifacts/incoming/paper_evidence.json` | `1ad5b95affa48803…` |

## Outlier Analysis

| Metric | Value |
|--------|-------|
| paper_evidence_files | 1 |
| unique_sha256_norm | 1 |
| outlier_detected | false |

## Message

Data court PASS: single source (no conflict detected). 1 evidence file(s) verified. SINGLE_SOURCE_MODE=true.

## Policy Reference

EDGE_LAB/DATA_CONFIRM_POLICY.md

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/DATA_COURT.md
