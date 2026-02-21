# EVIDENCE_CANON_RULES.md — Evidence Canonicalization Rules

version: 1.0.0
ssot_type: EVIDENCE_CANON_RULES
last_updated: 2026-02-21

## Purpose

Defines the exact rules for evidence normalization applied by `canon.mjs`.
Changes to these rules require PROPOSE→APPLY→RECEIPT protocol (R8).

## Allowed Volatile Markers

Lines that START WITH any of the following markers may be normalized:

```
UTC_TIMESTAMP_
Generated at
RUN_ID
Host:
Path:
generated_at:
Started:
Completed:
```

A line "starts with" a marker if the trimmed line content begins with the marker string
(leading whitespace is ignored for marker detection).

## Normalization Operations

Applied ONLY to lines starting with an allowed volatile marker:

1. Replace ISO-8601 timestamps (`20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z`) with `RUN_ID`
2. Replace `(\d+ms)` with `(RUN_MS)`
3. Replace `after \d+ms` (case-insensitive) with `after RUN_MS`

## Forbidden Semantic Tokens (D005 Guard)

The following tokens are FORBIDDEN in non-volatile lines that are modified by canon.
If canon touches a non-volatile line containing any of these tokens => FAIL D005.

Word-boundary match, case-insensitive:
```
threshold
limit
ratio
delta
pnl
slippage
expectancy
kelly
sharpe
drawdown
```

## D005 Trigger Condition

D005 fires ONLY IF:
1. A NON-volatile line is modified (changed from original), AND
2. That line contains at least one forbidden semantic token (word-boundary, case-insensitive)

NOTE: Since normalization only operates on volatile lines (by design), D005 can only
be triggered by a bug in the canon implementation. The selftest verifies this invariant.

## Receipt Chain

Evidence receipt chains use `sha256_norm` exclusively (R4, R5).
Raw SHA256 (`sha256_raw`) is included for auditability but MUST NOT be used for PASS/FAIL.

## Apply Protocol

Any change to these rules requires:
1. PROPOSE: document proposed change in a PR comment
2. APPLY: update this file AND run canon_selftest gate
3. RECEIPT: commit includes CANON_SELFTEST.md evidence with PASS status
