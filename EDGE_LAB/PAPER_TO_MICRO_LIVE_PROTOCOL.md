# PAPER_TO_MICRO_LIVE_PROTOCOL

## Stage 1 — Paper
- Require `PAPER_COURT.md` status PASS.
- Require `EXECUTION_DRIFT.md` within thresholds.
- Require `SLI_BASELINE.md` status PASS.

## Stage 2 — Micro-live (guarded)
- LIVE remains disabled by default.
- Enable only after explicit operator approval and release-governor evidence.
- Use minimal notional sizing and immediate rollback trigger on reject/slippage drift breach.

## Hard stops
- Any gate BLOCKED => stop promotion.
- Any missing evidence artifact => stop promotion.
