# PROOF_ENVELOPE_INDEX.md

STATUS: NEEDS_DATA
REASON_CODE: EP02_REAL_REQUIRED
RUN_ID: 4c3eeb8ff082
NEXT_ACTION: npm run -s epoch:edge:profit:public:00:x2:node22

- profile: stub

## Court Summary

- expectancy_ci95_low_gt_zero: true (value=0.28001992)
- psr_gate: true (psr0=1, min=0.95)
- min_trl_gate: true (value=3.6, min=2)
- pbo_gate: false (value=NaN, max=0.3)
- mcdd_p95_gate: false (value=NaN, max=Infinity)

| gate | status | reason_code | next_action |
|---|---|---|---|
| expectancy_proof | NEEDS_DATA | EP02_REAL_REQUIRED | npm run -s edge:profit:00:import:csv |
| pbo_cpcv | NEEDS_DATA | EP02_REAL_REQUIRED | npm run -s edge:profit:00:import:csv |
| risk_mcdd | NEEDS_DATA | EP02_REAL_REQUIRED | npm run -s edge:profit:00:import:csv |
