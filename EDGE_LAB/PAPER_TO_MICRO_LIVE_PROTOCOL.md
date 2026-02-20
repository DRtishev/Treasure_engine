# PAPER_TO_MICRO_LIVE_PROTOCOL

version: 2.0.0
last_updated: 2026-02-20

## Purpose

Executable protocol for promoting profit candidates from paper trading to micro-live.
Each stage has explicit checklists, stop-rules, capital constraints, and SLI requirements.
No stage may be skipped. LIVE remains disabled by policy until all gates pass.

---

## Stage 1 — Paper Trading

### Prerequisites
- [ ] PROFIT_CANDIDATES_COURT.md STATUS=PASS
- [ ] EXECUTION_REALITY_COURT.md STATUS=PASS (requires proxy_expectancy validated)
- [ ] PAPER_COURT.md STATUS=PASS
- [ ] EXECUTION_DRIFT.md within thresholds (SLIPPAGE_MODEL_ERROR <= 0.30, FILL_RATE >= 0.99)
- [ ] SLI_BASELINE.md STATUS=PASS
- [ ] PROXY_GUARD STATUS=PASS (all proxy terms covered)
- [ ] RISK_FSM state <= CAUTIOUS at session start

### Minimum Capital / Risk Limits
- min_capital: $1,000 USD equivalent (paper simulation only, no real capital)
- risk_per_trade: 1.0% of simulated equity (max $20 per trade at $2,000 equity)
- max_concurrent_positions: 2 (per instrument family)
- max_daily_loss: 2.0% of simulated equity

### SLI Requirements
- LATENCY_P95 must remain <= 500ms
- FILL_RATE must remain >= 0.99
- REJECT_RATE must remain <= 0.005
- SLIPPAGE_MODEL_ERROR must remain <= 0.30

### Hard Stop Conditions (Stage 1)
- Any gate BLOCKED or missing evidence → stop paper trading session
- Any missing evidence artifact → stop promotion
- Simulated drawdown > 5% → pause and review
- 3 consecutive losses within 24h → pause strategy, review RISK_FSM

### Minimum Paper Duration
- Minimum: 30 trading days or 100 trades per candidate (whichever is longer)
- OOS requirement: paper results must not overlap with WFO training data periods

---

## Stage 2 — Micro-Live (guarded)

### Prerequisites (all must be satisfied)
- [ ] Stage 1 paper trading complete (minimum 30 days and 100 trades)
- [ ] PROFIT_CANDIDATES_COURT.md STATUS=PASS
- [ ] EXECUTION_REALITY_COURT.md STATUS=PASS (measured expectancy, not proxy)
- [ ] MICRO_LIVE_READINESS.md STATUS=PASS
- [ ] PAPER_COURT.md STATUS=PASS
- [ ] SLI_BASELINE.md STATUS=PASS
- [ ] RISK_FSM state <= CAUTIOUS at session start
- [ ] Operator explicit approval documented in MICRO_LIVE_APPROVAL.md (manual artifact)

### Minimum Capital / Risk Limits
- min_capital: $500 USD equivalent (real capital — minimum viable micro-live)
- max_capital: $2,000 USD equivalent (hard ceiling for micro-live stage)
- risk_per_trade: 0.5% of account equity (conservative: half of paper setting)
- max_daily_loss: 1.0% of account equity
- max_concurrent_positions: 1 initially (expand to 2 only after 20 profitable trades)

### SLI Requirements (tighter than paper)
- LATENCY_P95 must remain <= 300ms (measured from real order submission)
- FILL_RATE must remain >= 0.99 (real fills)
- REJECT_RATE must remain <= 0.005 (real rejects)
- SLIPPAGE_MODEL_ERROR must remain <= 0.25 (tighter than paper threshold)
- Real slippage must be measured and compared to EXECUTION_MODEL.md baseline

### Hard Stop Conditions (Stage 2 — Stop Rules)
- Account drawdown > 3% → immediate halt, review required before resuming
- Account drawdown > 5% → halt strategy, require operator approval to resume
- Account drawdown > 10% → permanent halt, postmortem required
- 3 consecutive losses within 24h → automatic strategy pause for 4h
- Any execution reject rate > 1% over 50 orders → halt and diagnose
- Any slippage > 3x EXECUTION_MODEL.md baseline → halt and diagnose
- Any gate transitions to BLOCKED → immediate halt

### Rollback Trigger
- Micro-live is immediately halted and rolled back to paper if:
  1. Any hard stop condition triggers
  2. Execution drift exceeds SLIPPAGE_MODEL_ERROR > 0.40
  3. Network/exchange connectivity < 99% over 24h window
  4. Risk FSM enters HALTED (S3) or EMERGENCY (S4) state

---

## Stage 3 — Live (disabled by default)

LIVE_ELIGIBLE: false — permanent default.
Enable only after:
- Minimum 90 days micro-live with no hard stop triggers
- Measured expectancy > 0 under 2x execution stress (real data, not proxy)
- Explicit board-level operator approval with release-governor evidence
- All SLOs at GREEN status for 30 consecutive days

---

## Hard Stops (Global — Any Stage)

- Any gate BLOCKED => stop promotion
- Any missing evidence artifact => stop promotion
- RISK_FSM in EMERGENCY (S4) state => immediate halt across all stages
- Evidence tamper detected (SHA256CHECK FAIL) => halt pending re-verification

---

## Protocol Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-02-19 | Initial protocol — basic stage definitions |
| 2.0.0 | 2026-02-20 | Executable protocol: checklists, stop-rules, min capital, SLI requirements |
