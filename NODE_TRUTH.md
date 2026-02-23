# NODE_TRUTH.md — Node.js Single Source of Truth

version: 1.0.0
ssot_type: NODE_TRUTH
last_updated: 2026-02-21

## Purpose

This file is the authoritative SSOT for Node.js version governance.
All gate scripts read this file. Manual changes require PROPOSE→APPLY→RECEIPT protocol.

## Allowed Node Family

```
allowed_family: 22
hard_pinned_minor: 22.22.0
```

## Engines Alignment

From package.json `engines`: `>=22 <25`

Node 22.x satisfies this constraint and is the pinned production family.

## Version Files

| File | Value | Notes |
|------|-------|-------|
| .nvmrc | 22.22.0 | Production-pinned hint file |
| .node-version | 22.22.0 | Production-pinned hint file |
| package.json engines | >=22 <25 | Active constraint |
| NODE_TRUTH.md (this file) | 22 | **Authoritative: family 22 is production-pinned** |

## Gate Behavior

- `node_truth_gate.mjs` reads this file and validates `process.version` against `allowed_family`.
- PASS if `process.version` satisfies `v{allowed_family}.*`.
- FAIL NT02 if mismatch between running node and allowed_family.
- BLOCKED NT01 if this file is missing.

## Migration Note

When promoting a new Node family:
1. Update `allowed_family` and `hard_pinned_minor` in this file
2. Run PROPOSE→APPLY→RECEIPT protocol
3. Update .nvmrc and .node-version to match
4. Run `node_truth_gate.mjs` to verify

## Reason Codes

- NT01: BLOCKED — NODE_TRUTH.md missing
- NT02: FAIL — Node mismatch vs SSOT
