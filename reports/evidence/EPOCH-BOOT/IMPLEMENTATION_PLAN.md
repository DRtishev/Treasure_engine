# IMPLEMENTATION_PLAN — EPOCH-BOOT

## Atomic steps
1. Capture preflight and inventory outputs.
2. Validate spec lock (`specs/` presence and key SSOT files).
3. Normalize repo-level docs/ignore rules if needed.
4. Install dependencies using lockfile (`npm ci`).
5. Execute baseline gates and anti-flake reruns with persistent logs.
6. Regenerate evidence checksums after all outputs are final.
7. Build release export (`FINAL_VALIDATED.zip`) and checksum.
8. Record summary and risk assessment.

## Files expected to modify/create
- `README.md`
- `.gitignore`
- `reports/evidence/EPOCH-BOOT/*`
- `FINAL_VALIDATED.zip.sha256`

## Expected LOC
< 200 LOC functional documentation/evidence updates.

## Rollback plan
- Revert commit to return to previous baseline.
- Remove generated evidence folder and export artifacts if required.
