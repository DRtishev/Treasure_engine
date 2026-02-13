# DRIFT MAP — EPOCH-EDGE-MERGE-READY-01

| Issue | Severity | Fix strategy (minimal) | Proof gate |
|---|---|---|---|
| Ledger epochs 31..40 still `READY` while verify implementation/evidence already exists. | P0 | Apply Option A: set `status=DONE` for 31..40 and bind evidence to `EPOCH-EDGE-MERGE-READY-01`. | `npm run verify:specs` run1/run2 + `npm run verify:edge` run1/run2 pass after ledger update. |
| No deterministic packaging flow for merge-sharing of validated foundation subset. | P1 | Add deterministic tarball packager with stable ordering/mtime and explicit input checksum manifest. | `npm run package:final-validated` + output hashes in evidence. |
| Packaging scope drift risk (unbounded export) versus required SSOT/EDGE files. | P1 | Restrict package include list to core/edge, scripts/verify, SSOT docs, epoch31..40 specs + INDEX + LEDGER. | `FINAL_VALIDATED_INPUTS.sha256` path list and tar hash under evidence root. |
