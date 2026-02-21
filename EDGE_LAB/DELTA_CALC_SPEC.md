# DELTA_CALC_SPEC.md — Delta Calculation Specification

version: 1.0.0
ssot_type: DELTA_CALC_SPEC
last_updated: 2026-02-21

## Purpose

Defines how deltas (differences between evidence runs) are calculated for
comparison, drift detection, and receipt chaining.

## Delta Calculation Rules

### sha256_norm Delta
The authoritative delta method. Compare `sha256_norm` values between runs.
- `sha256_norm` = SHA256(stableEvidenceNormalize(content))
- Volatile fields (timestamps, RUN_ID, etc.) are normalized before hashing
- Same semantic content => same sha256_norm, regardless of when generated

### sha256_raw Delta
Informational only. Compare `sha256_raw` (raw file hash).
- Raw hash includes timestamps and may differ between runs
- sha256_raw drift is EXPECTED and NOT a failure indicator
- sha256_raw is stored for audit trail only

### Drift Detection
```
delta_detected = (sha256_norm_run1 != sha256_norm_run2)
```
If delta_detected=true => D002 FAIL (nondeterminism)

## Numeric Delta Calculation

For numeric evidence values (PnL, Sharpe, etc.):
- Normalize via `canonNum(value, dp=4)` before comparison
- Delta = |value_a - value_b|
- Relative delta = delta / max(|value_a|, |value_b|, epsilon)

## Scope Delta (E003)

Scope delta is detected when SCOPE_MANIFEST_SHA changes:
```
scope_delta = (scope_manifest_sha_current != scope_manifest_sha_baseline)
```
If scope_delta=true without APPLY receipt => E003 FAIL

## Receipt Chain Delta

Each receipt in the chain stores `sha256_norm` of the evidence at that point.
A break in the chain (missing receipt or hash mismatch) => E001 FAIL.
