# VERDICT
Status: SAFE-WITH-LIMITATIONS

## Reasons
- Required offline wall gates passed with anti-flake runs and multi-seed stability.
- Run-scoped outputs confirmed under reports/runs/<gate>/<seed>/<repeat>/<run_id>/.
- Manifests validated for source/evidence/export.

## Limitations
- npm emits non-fatal warning: unknown env config `http-proxy` in environment.
- `regen:manifests` still defaults to EPOCH-BOOT.AUTOPILOT path and was supplemented with epoch-local manifests.

## Evidence paths
- Main evidence: reports/evidence/EPOCH-AUTOPILOT-START
- Gate logs: reports/evidence/EPOCH-AUTOPILOT-START/gates/
- Manifest checks: reports/evidence/EPOCH-AUTOPILOT-START/manifests/
- Export hash file: FINAL_VALIDATED.zip.sha256
- Evidence archive hash: artifacts/incoming/EVIDENCE_PACK_EPOCH-AUTOPILOT-START.tar.gz.sha256
