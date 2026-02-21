# DATA_CONFIRM_POLICY.md — Data Confirmation Policy

version: 1.0.0
ssot_type: DATA_CONFIRM_POLICY
last_updated: 2026-02-21

## Purpose

Governs how evidence data is confirmed as authoritative when multiple sources are present.
Implements the SINGLE_SOURCE_MODE default for the Data Court.

## Default Mode: SINGLE_SOURCE_MODE

In SINGLE_SOURCE_MODE (default):
- All evidence must come from exactly one authoritative data source
- Multiple competing sources are treated as outliers
- Outlier detection => DC90 NEEDS_DATA (requires manual confirmation)

## Reason Codes

| Code | Action | Description |
|------|--------|-------------|
| DC90 | NEEDS_DATA | Data outlier detected — multiple sources conflict. Manual confirmation required. |
| DC91 | BLOCKED | No authoritative data source confirmed. Cannot proceed. |
| DC92 | FAIL | Data source mismatch vs confirmed SSOT. |

## Outlier Threshold

An outlier is flagged when:
- More than one data source provides the same metric with conflicting values, AND
- The relative difference exceeds 0.1% (configurable via env DATA_OUTLIER_THRESHOLD)

## Manual Confirmation

To confirm a data source when DC90 is raised:
1. Identify the authoritative source (exchange API, canonical fixture, etc.)
2. Set `DATA_SOURCE_CONFIRMED=1` in the run environment
3. Rerun the data court — it will use the confirmed source

## SINGLE_SOURCE requirement

Gates that depend on data court results MUST check for PASS status.
A NEEDS_DATA result from the data court propagates as blocking evidence for downstream courts.
