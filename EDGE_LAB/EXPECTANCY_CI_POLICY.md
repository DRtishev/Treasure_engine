# EXPECTANCY_CI_POLICY.md — Expectancy Bootstrap CI Court Policy
version: 1.0.0
last_updated: 2026-02-21
epoch: EPOCH_P1_EXPECTANCY_CI_COURT
validator: scripts/edge/edge_lab/edge_expectancy_ci.mjs
gate_output: reports/evidence/EDGE_LAB/EXPECTANCY_CI.md

---

## Purpose

Makes expectancy measurable and statistically defensible.
A strategy with positive sample mean but negative CI lower bound
is NOT ready for promotion — it may be lucky noise.

**Gate rule**: `CI95_lower > 0` required for PASS (all candidates).

---

## 1. Minimum Sample Policy

| Threshold | Policy |
|-----------|--------|
| n < 30 | NEEDS_DATA (X003: INSUFFICIENT_SAMPLES) — not enough for reliable CI |
| 30 ≤ n < 100 | CI computed but flagged CAUTION |
| n ≥ 100 | PREFERRED — tight CI, reliable estimate |

Applies **per candidate**. Any candidate with n < 30 → entire gate NEEDS_DATA.

---

## 2. Bootstrap Method

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| method | Percentile bootstrap | Non-parametric, no normality assumption |
| n_resamples | 10,000 | Sufficient for stable 95% CI to 2 decimal places |
| confidence_level | 95% | Industry standard for strategy vetting |
| statistic | mean per-trade return | Expectancy |
| alternative | two-sided | Report both bounds; gate uses lower bound only |

Resample with replacement from the per-trade return vector.

---

## 3. Seed Policy (Determinism Guarantee)

The PRNG seed is derived from content, not from system time or run count:

```
seed = parseInt(evidence_hash_v1[0:8], 16)   // primary: V1 paper evidence hash
     OR parseInt(SHA256(summary_evidence)[0:8], 16)  // fallback: hash of summary data
```

This guarantees: **same input data → same CI bounds byte-for-byte**.

PRNG: XorShift32 (period 2^32 − 1, trivially reproducible in any language).

---

## 4. Per-Trade Return Construction

Source priority:
1. Trade-level V1 evidence (`paper_evidence.valid.json`) → individual fill prices (future: pnl_pct per trade)
2. Summary evidence (`paper_evidence.json`) → reconstruct from win_rate + avg_winner + avg_loser

MVP reconstruction (when explicit pnl_pct unavailable):
```
for each candidate:
  n_wins  = round(win_rate × trade_count)
  n_losses = trade_count - n_wins
  returns = [avg_winner_pct] × n_wins + [avg_loser_pct] × n_losses
```

This is **exact** if all winners have the same return (simplification for MVP).
Upgrade path: when V1 evidence carries per-trade pnl_pct, use those directly.

---

## 5. Gate Definition

| Condition | Status | Reason Code |
|-----------|--------|-------------|
| Paper evidence gate MISSING | NEEDS_DATA | X001: PAPER_EVIDENCE_GATE_MISSING |
| Paper evidence gate not PASS | NEEDS_DATA | X002: PAPER_EVIDENCE_NOT_VALIDATED |
| Any candidate n < 30 | NEEDS_DATA | X003: INSUFFICIENT_SAMPLES |
| All CI95_lower > 0 | PASS | NONE |
| Any CI95_lower ≤ 0 | BLOCKED | X004: CI_LOWER_NOT_POSITIVE |
| Expectancy data missing (no avg_winner/avg_loser) | NEEDS_DATA | X005: RETURN_DATA_MISSING |

---

## 6. Output Fields (per candidate)

| Field | Type | Notes |
|-------|------|-------|
| name | string | Candidate name |
| n | integer | Sample size (trade count) |
| mean_return_pct | number | Sample mean return % |
| ci95_lower_pct | number | 2.5th percentile of bootstrap means |
| ci95_upper_pct | number | 97.5th percentile of bootstrap means |
| ci_width_pct | number | ci95_upper - ci95_lower |
| passes_ci_gate | boolean | ci95_lower > 0 |
| sample_adequacy | string | PREFERRED / CAUTION / NEEDS_DATA |

---

## 7. Reason Code Taxonomy (X***)

| Code | Name | Description |
|------|------|-------------|
| X001 | PAPER_EVIDENCE_GATE_MISSING | paper_evidence_court.json not found |
| X002 | PAPER_EVIDENCE_NOT_VALIDATED | paper_evidence_court status != PASS |
| X003 | INSUFFICIENT_SAMPLES | trade_count < 30 for one or more candidates |
| X004 | CI_LOWER_NOT_POSITIVE | CI95_lower ≤ 0 for one or more candidates |
| X005 | RETURN_DATA_MISSING | Cannot reconstruct per-trade returns (no avg_winner/avg_loser) |

---

## 8. Upgrade Path

When paper evidence V2 includes `pnl_pct` per trade:
- Replace mean-reconstruction with actual per-trade values
- Re-run bootstrap; seed changes (content changed → hash changes → new seed)
- CI becomes tighter and more honest

Merkle extension (when n > 1000): build per-trade Merkle tree, verify subset proofs.

---

## MCL Notes

FRAME: Non-parametric bootstrap CI on per-trade expectancy.
RISKS: Small n → wide CI → NEEDS_DATA (correct behavior).
CONTRACT: edge_expectancy_ci.mjs enforces all gates. Deterministic seed.
MIN-DIFF: No new dependencies. Pure Node stdlib + PRNG.
RED-TEAM: Submit 1 lucky trade → n < 30 → NEEDS_DATA. Submit losing trades → CI95_lower ≤ 0 → BLOCKED.
