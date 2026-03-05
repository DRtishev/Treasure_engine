# RG_RECON_E2E02: Reconciliation E2E

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
CHECKS: 5
VIOLATIONS: 0

- [PASS] no_drift_ok: action=RECON_OK, ok=true
- [PASS] price_drift_halt: action=RECON_HALT_MISMATCH, drifts=1
- [PASS] fee_drift_warn: action=RECON_WARN_DRIFT
- [PASS] funding_drift_detected: OK: FUNDING_DRIFT found
- [PASS] recon_action_constants: OK
