# EDGE D1..D9 Decision Matrix

## Operator Summary
- This matrix compares design approaches for EDGE rollout decisions.
- Scores are comparative, not absolute truth.
- Reliability and safety dominate optimization criteria.
- Complexity score is reversed (higher means simpler to operate).
- Determinism fit is a first-class criterion.
- MVP paths are preferred for initial implementation safety.
- MAX paths are staged after gates stabilize.
- Every chosen option must map to acceptance criteria.
- Changes to scores require rationale and evidence.
- Use this table during E31 sprint planning and future RFCs.

## Where to look next
- Recommended baseline stack: `docs/EDGE_RESEARCH/RECOMMENDED_STACK.md`.
- Epoch contracts and gates: `specs/epochs/EPOCH-31.md` ... `EPOCH-40.md`.

Scoring: 1 (worst) → 10 (best)

| Decision | Approach | Reliability | Complexity (rev) | Scalability | Determinism fit | Safety fit | Recommended phase |
|---|---|---:|---:|---:|---:|---:|---|
| D1 Data storage | MVP: immutable local snapshots + manifests | 8 | 8 | 7 | 9 | 8 | E31 start |
| D1 Data storage | MAX: append-only lake + metadata index | 9 | 5 | 9 | 9 | 9 | Post-E34 |
| D2 Feature pipeline | MVP: deterministic batch extractor | 8 | 8 | 7 | 10 | 8 | E31 |
| D2 Feature pipeline | MAX: lineage DAG and cache graph | 9 | 5 | 9 | 10 | 9 | Post-E35 |
| D3 Simulator | MVP: spread+fee+latency | 7 | 9 | 7 | 9 | 8 | E32 |
| D3 Simulator | MAX: impact+queue+partial fills | 9 | 4 | 8 | 8 | 9 | Post-E32 calibration |
| D4 Strategy registry | MVP: JSON manifest + semver guard | 8 | 9 | 7 | 10 | 9 | E33 |
| D4 Strategy registry | MAX: signed artifacts + attestation | 9 | 4 | 9 | 10 | 10 | Post-E36 |
| D5 Signal→Intent | MVP: pure deterministic mapper | 8 | 9 | 7 | 10 | 9 | E34 |
| D5 Signal→Intent | MAX: policy DSL engine | 9 | 5 | 9 | 9 | 10 | Post-E34 |
| D6 Allocation | MVP: capped vol targeting | 8 | 8 | 8 | 9 | 9 | E35 |
| D6 Allocation | MAX: bounded fractional Kelly optimizer | 9 | 5 | 9 | 8 | 9 | Post-E35 |
| D7 Risk brain | MVP: FSM + static thresholds | 9 | 8 | 8 | 9 | 10 | E36 |
| D7 Risk brain | MAX: adaptive thresholds | 9 | 5 | 9 | 8 | 10 | Post-E38 |
| D8 Validation | MVP: locked WFO + leakage battery | 9 | 8 | 8 | 10 | 9 | E37 |
| D8 Validation | MAX: CPCV + PBO/DSR/SPA/WRC | 10 | 4 | 8 | 9 | 10 | Post-E37 |
| D9 Deployment | MVP: shadow-only + canary ladder | 10 | 8 | 8 | 9 | 10 | E39 |
| D9 Deployment | MAX: full governor automation | 10 | 5 | 9 | 9 | 10 | E40+ |
