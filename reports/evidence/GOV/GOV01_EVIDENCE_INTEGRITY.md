# GOV01_EVIDENCE_INTEGRITY.md — P1 GOV01 Evidence Integrity Gate

STATUS: PASS
REASON_CODE: NONE
RUN_ID: b455ad077aff
NEXT_ACTION: npm run -s gov:integrity

## GOV01 Policy

Evidence MUST NOT be manually edited (MANUAL_EDITS_FORBIDDEN=true).
This gate makes the policy mathematical: recomputed values must match anchored ones.
Any mismatch => BLOCKED GOV01.

## Comparison Results

| Check | Anchored (prefix) | Computed (prefix) | Result | Note |
|-------|-------------------|-------------------|--------|------|
| C01_SCOPE_MANIFEST_SHA | a202ce963b6330f5… | a202ce963b6330f5… | MATCH | MATCH — no tampering detected |
| C02_MERKLE_ROOT | a91446a84476e375… | a91446a84476e375… | MATCH | MATCH — no tampering detected |
| C03_RECEIPTS_CHAIN_FINAL | 0cb69e38613a67cc… | 0cb69e38613a67cc… | MATCH | MATCH — no tampering detected |

## Diff Hints

NO DRIFT — all anchored values match computed values.

## Scope Summary

| Metric | Value |
|--------|-------|
| Files in scope | 115 |
| Files accessible | 115 |
| Comparisons | 3 |
| Mismatches | 0 |

## Evidence Anchors

| Anchor | File |
|--------|------|
| SCOPE_MANIFEST_SHA | reports/evidence/EDGE_LAB/P0/CHECKSUMS.md |
| MERKLE_ROOT | reports/evidence/GOV/MERKLE_ROOT.md |
| RECEIPTS_CHAIN_FINAL | reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md |

## Evidence Paths

- reports/evidence/GOV/GOV01_EVIDENCE_INTEGRITY.md
- reports/evidence/GOV/gates/manual/gov01_evidence_integrity.json
