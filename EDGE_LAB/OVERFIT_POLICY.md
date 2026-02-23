# OVERFIT_POLICY.md — EDGE_PROFIT_00 MVP Defense

## Objective

Provide a minimal overfit defense for telemetry-first paper evidence.

## Inputs

- hypothesis registry count (trial universe proxy)
- expectancy court outputs (Sharpe proxy, PSR(0), N)

## MVP checks

- Trial registry must exist and be non-empty.
- Compute a corrected PSR threshold as:
  - `psr_threshold_corrected = min(0.995, base_psr_threshold + 0.01 * ln(max(1, trials)))`
- Overfit PASS when:
  - expectancy status is PASS, and
  - `psr0 >= psr_threshold_corrected`

## Fail-closed

- Missing registry/expectancy evidence => BLOCKED (`ME01`).
- Empty trial registry => BLOCKED (`OF01`).
- If expectancy is `NEEDS_DATA`, overfit returns `NEEDS_DATA`.

## Safety

This policy cannot unlock live trading and does not override ZW01.
