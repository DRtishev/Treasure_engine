# MANIFEST_CHECK

## Purpose
Fail-closed manifest verification for EDGE_LAB evidence runs.

## Procedure
1. Generate court evidence using `npm run edge:all`.
2. Run `npm run edge:next-epoch` to validate manifest integrity and downstream gates.
3. Compare root-level files in `reports/evidence/EDGE_LAB/` against `EDGE_LAB/COURT_MANIFEST.md`.
4. Emit machine-readable result at `reports/evidence/EDGE_LAB/gates/manual/contract_manifest_result.json`.
5. Emit human-readable result at `reports/evidence/EDGE_LAB/MANIFEST_CHECK_RESULT.md`.

## Failure codes
- `CONTRACT_DRIFT`: required file is missing.
- `MISSING_EVIDENCE`: machine output missing.
- `EXTRA_EVIDENCE`: unexpected file appears at root scope.

## Operator rule
If manifest check is not PASS, final verdict must be BLOCKED.
