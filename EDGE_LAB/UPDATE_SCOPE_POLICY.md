# UPDATE_SCOPE_POLICY.md — Scope Update Governance Policy

version: 1.0.0
ssot_type: UPDATE_SCOPE_POLICY
last_updated: 2026-02-21

## Purpose

Governs how the CHECKSUMS scope (evidence file set under SHA256 ledger) may change.
Prevents silent scope drift and ensures tamper-evident provenance.

## Scope Definition

The ledger scope is determined dynamically by `edge_evidence_hashes.mjs`:
1. `reports/evidence/EDGE_LAB/*.md` (excluding self-outputs: SHA256SUMS.md, SHA256CHECK.md)
2. `reports/evidence/EDGE_LAB/gates/manual/*.json`
3. `EDGE_LAB/*.md` (governance contracts)
4. `scripts/edge/edge_lab/*.mjs` (pipeline scripts)

## SCOPE_MANIFEST_SHA

Every CHECKSUMS.md includes a `SCOPE_MANIFEST_SHA` — the SHA256 of the sorted
path list (one path per line, ASCII lexicographic order).

Purpose: detect if the set of files in scope changed between runs without APPLY receipt.

## Drift Detection

If `SCOPE_MANIFEST_SHA` changes across runs (or from the committed baseline) without
a corresponding APPLY receipt => FAIL E003 (scope mutation without apply receipt).

## Allowed Scope Changes

Scope may change only via:
1. Adding a new evidence-generating script (new court) — requires APPLY receipt
2. Removing a deprecated court — requires APPLY receipt
3. Adding new SSOT governance files to EDGE_LAB/ — requires APPLY receipt

## Forbidden Operations

- Silent scope additions (new file appears in scope without APPLY receipt): FAIL E003
- Scope reordering without APPLY receipt: FAIL E003
- Removing files from scope without APPLY receipt: FAIL E003

## APPLY Protocol

1. Propose: document the scope change in PR description
2. Apply: merge the change; CHECKSUMS.md is regenerated with new SCOPE_MANIFEST_SHA
3. Receipt: the commit SHA becomes the receipt for this scope change
