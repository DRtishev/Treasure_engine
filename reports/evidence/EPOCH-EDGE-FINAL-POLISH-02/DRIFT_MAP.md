# Drift Map

## Findings
1. Spec quality gate did not enforce the hard rule for EDGE 31..40 risk register depth (>=7 risks) and did not reject TAB characters in required spec surfaces.

## Fix
1. Hardened `scripts/verify/specs_check.mjs`:
   - Added TAB character rejection for all required files.
   - Added EDGE-specific risk rule: epochs 31..40 must contain at least 7 risks.

## Proof
- Post-fix specs gate passed twice:
  - `reports/evidence/EPOCH-EDGE-FINAL-POLISH-02/gates/verify-specs.postfix.run1.log`
  - `reports/evidence/EPOCH-EDGE-FINAL-POLISH-02/gates/verify-specs.postfix.run2.log`
- Edge aggregate gate passed twice with required evidence checks enabled:
  - `reports/evidence/EPOCH-EDGE-FINAL-POLISH-02/gates/verify-edge.postfix.run1.log`
  - `reports/evidence/EPOCH-EDGE-FINAL-POLISH-02/gates/verify-edge.postfix.run2.log`
