# GOLDENS_APPLY_PROTOCOL.md — Golden Vectors Apply Protocol

version: 1.0.0
ssot_type: GOLDENS_APPLY_PROTOCOL
last_updated: 2026-02-21

## Purpose

Governs when and how golden test vectors may be updated.
Prevents silent golden drift and ensures all updates are intentional and reviewed.

## Default Behavior

By default, golden update attempts are BLOCKED:
- `goldens_apply_gate.mjs` returns G001 BLOCKED if update attempted without protocol
- G001 means: "Golden update attempted without APPLY protocol + UPDATE_GOLDENS=1"

## APPLY Protocol

To update golden vectors:

1. **Confirm** the update is intentional (review actual vs expected diff)
2. **Set env var**: `UPDATE_GOLDENS=1`
3. **Run update command**: `npm run verify:goldens:update`
4. **Review diff**: ensure only expected changes
5. **Commit**: include golden update in a dedicated commit with APPLY receipt message
6. **Receipt**: commit message must include "GOLDENS_APPLY: <reason>"

## G001 Prevention

The `goldens_apply_gate.mjs` checks:
1. If golden files exist and differ from current run output => compare
2. If mismatch AND UPDATE_GOLDENS != '1' => BLOCKED G001
3. If mismatch AND UPDATE_GOLDENS = '1' => update golden and record receipt

## G002 Detection

G002 (FAIL) triggers when:
- Golden files match the committed version
- Current run output differs from golden under authoritative Node (NODE_TRUTH.md)
- This indicates a regression

## Reason Codes

| Code | Action | Description |
|------|--------|-------------|
| G001 | BLOCKED | Golden update attempted without APPLY protocol + UPDATE_GOLDENS=1 |
| G002 | FAIL | Golden mismatch under authoritative Node truth (regression) |
