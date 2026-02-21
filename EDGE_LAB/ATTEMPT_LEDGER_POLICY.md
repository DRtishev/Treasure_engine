# ATTEMPT_LEDGER_POLICY.md — Multi-Hypothesis Attempt Ledger Policy

epoch: MULTI_HYPOTHESIS_COURT_V1
version: 1.0.0
last_updated: 2026-02-21

## Purpose

Defines how hypothesis attempts are counted and how Bonferroni correction is applied
to control the false discovery rate from testing multiple trading strategies.

When N independent strategies are tested against the same OOS data, ~N×alpha_nominal
would pass by chance alone. This court applies statistical correction.

---

## Reason Codes

| Code | Name | Exit |
|------|------|------|
| H001 | CI_GATE_NOT_PASS | NEEDS_DATA (exit 0) |
| H002 | EVIDENCE_MISSING | NEEDS_DATA (exit 0) |
| H003 | LEDGER_MISSING | NEEDS_DATA (exit 0) |
| H004 | CORRECTED_CI_LOWER_NOT_POSITIVE | BLOCKED (exit 1) |
| NONE | PASS | exit 0 |

---

## 1. Attempt Definition

An **attempt** (hypothesis test) is any strategy that was evaluated against OOS data
and whose result could influence candidate selection.

| Category | Counting Rule |
|----------|--------------|
| TESTING candidates with OOS validation | 1 attempt per OOS period per candidate |
| DRAFT hacks with 0 trials | 0 attempts (not yet tested on OOS) |
| NEEDS_DATA hacks | 0 attempts (no data available) |
| IS optimization trials | NOT counted (same data, not independent) |

n_effective_oos_tests = n_testing_candidates × n_oos_periods_per_candidate

Default n_oos_periods = 2 (TRIALS_LEDGER.md structural constant: H1 + H2 2024).

---

## 2. Bonferroni Correction

Family-wise error rate (FWER) control:

```
alpha_nominal    = 0.05
n_tests          = n_testing_candidates × n_oos_periods
alpha_corrected  = alpha_nominal / n_tests
```

The bootstrap CI is re-run at the corrected confidence level:
```
ci_level_corrected = 1 - alpha_corrected
```

For PASS: corrected_CI_lower > 0 for ALL candidates.

---

## 3. PRNG / Determinism

Same XorShift32 seed as EXPECTANCY_CI_COURT (from evidence_hash V1 [0:8] hex → uint32).
Same n_resamples = 10,000.
Same per-candidate return reconstruction (win_rate, avg_winner_pct, avg_loser_pct).
Only the CI percentile cutoff differs (corrected alpha instead of 0.05).

Same input → same output byte-for-byte.

---

## 4. PASS / BLOCKED

| Condition | Verdict |
|-----------|---------|
| corrected_CI_lower > 0 for all candidates AND expectancy_ci PASS | PASS |
| corrected_CI_lower <= 0 for any candidate | BLOCKED (H004) |
| expectancy_ci not PASS | NEEDS_DATA (H001) |
| evidence files missing | NEEDS_DATA (H002/H003) |

---

## 5. MCL Notes

FRAME: Does our edge survive multi-hypothesis correction (Bonferroni on OOS tests)?
RISKS: Overcounting n_tests makes correction too strict; undercounting inflates FDR.
CONTRACT: edge_multi_hypothesis_mvp.mjs reads this file + expectancy_ci.json + paper_evidence.json.
MIN-DIFF: Advisory court for MVP; does not gate micro:live:readiness.
PROOF: Run npm run edge:multi:hypothesis; expect STATUS=PASS.
