# EPOCH-17.0 Summary

## Changes
- Added deterministic run artifact helpers and moved canonical sim/court reports into reports/runs/<run_id>/.
- Replaced random run_id generation in sim/court/paper verification paths with sha256(epoch+seed+hack_id)-based IDs.
- Routed schema verification and panel generation to latest run directory for canonical outputs.
- Split checksum manifests into SOURCE (stable tracked files) and EVIDENCE (logs/reports).

## Gate Results
- verify:e2 run1: PASS
- verify:e2 run2: PASS
- verify:paper run1: PASS
- verify:paper run2: PASS
- sha256sum -c SHA256SUMS.SOURCE.txt after reruns: PASS

## Known Limitations/Risks
- Legacy reports/*.json remain in repository history and are still tracked, but no longer overwritten by verify:e2 path.
- verify:e2 script still references reports/*.json paths textually; resolver redirects to latest run dir at runtime.

## Final Export
- FINAL_VALIDATED.zip sha256: 8f0c1b30f56169f4284522bd3fe8fc0b25688c777cf0031b339714597f43b813
