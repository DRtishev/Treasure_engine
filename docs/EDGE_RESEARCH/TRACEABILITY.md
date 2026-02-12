# EDGE Traceability Matrix (E31→E40)

## Purpose
Single-page mapping from epoch intent to execution proof.

| Epoch | Primary Contracts | Key Invariants | Planned Verify Gate | Required Evidence (minimum) |
|---|---|---|---|---|
| E31 | FeatureFrame, FeatureManifest | No look-ahead, train-only normalization, stable feature fingerprint | `verify:epoch31` | `epoch31/FEATURE_CONTRACTS.md`, `LOOKAHEAD_SENTINEL_PLAN.md`, `FINGERPRINT_RULES.md`, `VERDICT.md` |
| E32 | SimReport | No fantasy fills, non-negative fee/slippage/latency, explicit partial fills | `verify:epoch32` | `epoch32/SPEC_CONTRACTS.md`, `GATE_PLAN.md`, `FINGERPRINT_POLICY.md`, `VERDICT.md` |
| E33 | StrategyManifest | Immutable manifests, semver break policy, compatibility checks | `verify:epoch33` | `epoch33/SPEC_CONTRACTS.md`, `GATE_PLAN.md`, `FINGERPRINT_POLICY.md`, `VERDICT.md` |
| E34 | Signal, Intent | Deterministic mapping, hard reject rules, constraint auditability | `verify:epoch34` | `epoch34/SPEC_CONTRACTS.md`, `GATE_PLAN.md`, `FINGERPRINT_POLICY.md`, `VERDICT.md` |
| E35 | PortfolioState | Bounded sizing, leverage/concentration/turnover caps, HALTED blocks risk | `verify:epoch35` | `epoch35/SPEC_CONTRACTS.md`, `GATE_PLAN.md`, `FINGERPRINT_POLICY.md`, `VERDICT.md` |
| E36 | RiskState | FSM non-bypass, kill-switch matrix, cooldown governance | `verify:epoch36` | `epoch36/SPEC_CONTRACTS.md`, `GATE_PLAN.md`, `FINGERPRINT_POLICY.md`, `VERDICT.md` |
| E37 | WFOReport | Pre-committed windows, purge/embargo, leakage battery fail-on-injection | `verify:epoch37` | `epoch37/SPEC_CONTRACTS.md`, `GATE_PLAN.md`, `FINGERPRINT_POLICY.md`, `VERDICT.md` |
| E38 | GapReport | GapScore components required, brake escalation, FULL_STOP→HALTED | `verify:epoch38` | `epoch38/SPEC_CONTRACTS.md`, `GATE_PLAN.md`, `FINGERPRINT_POLICY.md`, `VERDICT.md` |
| E39 | ShadowRunRecord | `orders_submitted==0`, adapter disabled, canary sequence constraints | `verify:epoch39` | `epoch39/SPEC_CONTRACTS.md`, `GATE_PLAN.md`, `FINGERPRINT_POLICY.md`, `VERDICT.md` |
| E40 | CertificationReport | Green gate matrix, clean-clone reproducibility, immutable evidence hashes | `verify:epoch40` | `epoch40/SPEC_CONTRACTS.md`, `GATE_PLAN.md`, `FINGERPRINT_POLICY.md`, `VERDICT.md` |

## Audit shortcuts
- Determinism first: verify same-input fingerprint stability before reading performance metrics.
- Safety first: if no-order/no-network invariants are unverifiable, mark BLOCKED immediately.
