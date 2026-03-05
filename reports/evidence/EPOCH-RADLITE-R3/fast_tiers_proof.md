# R3.1 Fast Tiers Proof

## Gate: RG_FAST_TIERS_FAST01

### Implementation

- `package.json`: Added `verify:fast:instant` script with 10 critical gates
- Instant tier is a strict subset of `verify:fast`
- Budget: 10 gates (max 15 allowed)
- Timing: ~4.0s (target <5s)

### Selected Gates (instant tier)

1. node_toolchain_ensure
2. regression_toolchain_reason01
3. regression_unlock01
4. verify:repo:byte-audit:x2
5. regression_node_truth_alignment
6. regression_churn_contract01
7. regression_kill_switch01
8. regression_reconcile01
9. regression_flatten01
10. regression_nd_core_san01

### Evidence

- Gate verifies: instant exists, count ≤15, all instant gates present in full fast chain
- Timing test: 4.046s real time

### Verdict: PASS
