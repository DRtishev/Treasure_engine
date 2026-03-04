# SDD-004: Sprint 3 -- Profit Lane

> Software Design Document | Version 1.0.0
> Date: 2026-03-03 | Classification: INTERNAL
> Parent: [SDD-000 Master Roadmap](SDD_MASTER_ROADMAP.md)
> Predecessor: [SDD-003 Sprint 2 -- Backtest + Data](SDD_SPRINT_2_BACKTEST_DATA.md)
> Author: AI Architect (CERT mode) | Approver: DRtishev

---

## 1. Reality Snapshot

### Prerequisites (Sprint 2 DoD)

| Gate | Required State |
|------|---------------|
| verify:fast x2 | PASS (46+ gates, deterministic) |
| ops:life | EC=0 (ALIVE) |
| ops:doctor | EC=0 (HEALTHY, scoreboard >= 70) |
| Market impact model | Implemented, calibrated, x2 deterministic |
| Data feeds | >= 2 independent, SHA256 locked |
| Profit ledger | Refreshed with current metrics |
| BFM | >= 1.5x for at least 1 strategy (Sprint 3 eligibility) |
| Paper harness | Operational, >= 1 strategy running |
| Fill probe | Testnet fill detection working |

### Entering State

The organism is alive, deterministic, data-fed, and has a working paper trading harness. This sprint takes the system from **simulation to reality** through a fail-closed pipeline with 5 phases.

### Candidate Pipeline Status (Expected)

| Candidate | FSM State | BFM | Sharpe | Court Verdict |
|-----------|-----------|-----|--------|---------------|
| s1_breakout_atr | BACKTESTED | TBD | TBD | TBD |
| s3_liq_fusion | DRAFT | -- | -- | -- |
| s4_cascade_rider | DRAFT | -- | -- | -- |
| s5_regime_aware | DRAFT | -- | -- | -- |

### Governance FSM Status

```
Current: DRY_RUN mode
Target:  DRY_RUN -> LIVE_TESTNET -> CANARY_LIVE
         (each transition requires documented approval)
```

---

## 2. Goals

| # | Goal | Measurable Outcome |
|---|------|--------------------|
| G1 | Data capsule locked | >= 2 exchange data sources, SHA256 chain verified |
| G2 | Offline replay proven | Backtest x2 with real data, byte-identical |
| G3 | 7-court pipeline run | All candidates evaluated by full court suite |
| G4 | Paper trading proven | 30+ days, 100+ trades, evidence with SHA256 chain |
| G5 | Candidate graduated | >= 1 strategy: BACKTESTED -> PAPER_PROVEN via candidate FSM |
| G6 | Micro-live canary | 7+ days, $5-25 max, 1 trade/day, no catastrophic failure |
| G7 | First dollar | At least 1 profitable trade with real capital |

---

## 3. Non-Goals

- Scaling to high-frequency trading
- Multi-strategy portfolio optimization
- Full automation of governance approvals
- Building a trading dashboard/GUI
- Achieving consistent profitability (that's post-Sprint 3 optimization)
- Supporting more than 1-2 strategies in micro-live simultaneously

---

## 4. Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Max capital: micro-live | $5-25 total | Hardcoded in canary governor |
| Max trades: micro-live | 1 trade/day initially | Rate limiter |
| Governance approval | Each phase transition requires documented approval | Governance FSM |
| Evidence chain | SHA256 chain linking paper -> canary -> live evidence | R11 |
| Kill switch | Manual kill switch always available | Circuit breaker |
| No silent failures | All errors logged to EventBus | R1 + R2 |
| Testnet first | Every strategy must pass testnet before mainnet | Candidate FSM |

---

## 5. Design

### 5.1 Phase Architecture

```
PHASE 1: ACQUIRE + LOCK
    |  Input: Raw exchange data (OHLCV, funding, OI)
    |  Output: SHA256-locked capsules in artifacts/capsules/
    |  Mode: RESEARCH (double-key unlock, one-time)
    |  Duration: 3-5 days
    |
    v
PHASE 2: OFFLINE REPLAY + COURTS
    |  Input: Locked capsules
    |  Output: Backtest results x2 + 7-court verdicts
    |  Mode: CERT (offline, deterministic)
    |  Duration: 2-3 days
    |
    v
PHASE 3: PAPER TRADING
    |  Input: Court-approved strategy on testnet
    |  Output: 30+ days evidence with SHA256 chain
    |  Mode: PAPER (testnet, no real capital)
    |  Duration: 30-45 days
    |  FSM: BACKTESTED -> PAPER_PROVEN (CT02)
    |
    v
PHASE 4: GOVERNANCE REVIEW
    |  Input: Paper trading evidence pack
    |  Output: Documented approval for micro-live
    |  Mode: AUDIT
    |  Duration: 1-2 days
    |  FSM: Governance DRY_RUN -> LIVE_TESTNET -> CANARY_LIVE
    |
    v
PHASE 5: MICRO-LIVE CANARY
       Input: Approved strategy + mainnet credentials
       Output: 7+ days live evidence
       Mode: CANARY (real capital, extreme limits)
       Duration: 7-14 days
       FSM: PAPER_PROVEN -> CANARY_DEPLOYED (CT03)
```

### 5.2 Phase 1: Acquire + Lock

**Already partially implemented in Sprint 2.** This phase completes any remaining data acquisition.

**Capsule Inventory Target:**

| Capsule | Source | Range | Rows (est.) | Priority |
|---------|--------|-------|-------------|----------|
| OHLCV 1h | Binance | 12 months | ~8,760 | P0 |
| OHLCV 1h | Bybit | 12 months | ~8,760 | P1 |
| Funding rates | Binance | 6 months | ~26,280 | P0 |
| Open interest | Binance | 6 months | ~52,560 | P1 |
| Liquidation events | Bybit WS | 3 months | Variable | P2 |

**Lock Protocol:**

```bash
# For each capsule:
sha256sum artifacts/capsules/<capsule>.jsonl > artifacts/capsules/<capsule>.sha256
# Create lock file with metadata
node scripts/data/capsule_lock.mjs --capsule <capsule> --verify
# Verify lock:
node scripts/data/capsule_verify.mjs --capsule <capsule>
```

**Gate:** `regression_capsule_lock01_integrity`

### 5.3 Phase 2: Offline Replay + 7-Court Pipeline

**Replay Architecture:**

```
Locked Capsule -> replay_engine.mjs -> Bar Stream
    |
    +-- Strategy.init(config)
    +-- for each bar:
    |     +-- Strategy.onBar(bar, state, history)
    |     +-- if signal != HOLD:
    |           +-- Backtest Engine: simulateOrder()
    |           +-- Market Impact Model: adjustForImpact()
    |           +-- Ledger: recordTrade()
    |
    +-- Metrics: computeAll()
    +-- Courts: judgeAll(candidate, metrics, bars)
```

**7-Court Pipeline:**

| # | Court | Purpose | Veto Power | Threshold |
|---|-------|---------|------------|-----------|
| 1 | **deflatedSharpe** | Anti-overfit (adjust for params) | Yes | deflated >= 0.3 |
| 2 | **bootstrapCI** | Confidence interval on Sharpe | Yes | CI lower bound > 0 |
| 3 | **adversarialSafety** | Stress test (worst case) | Yes | Max adverse loss < 25% |
| 4 | **regimeStability** | Performance across regimes | No | Report only |
| 5 | **costReality** | Impact-adjusted profitability | Yes | BFM >= 1.5x |
| 6 | **dataQuality** | Input data integrity | Yes | Zero NaN/gaps in critical fields |
| 7 | **drawdownRecovery** | Recovery from max drawdown | No | Report recovery time |

**Court Verdict Aggregation:**

```javascript
function aggregateVerdicts(courtResults) {
  const vetoFails = courtResults.filter(c => c.veto_power && c.verdict === 'FAIL');
  if (vetoFails.length > 0) {
    return { verdict: 'REJECTED', reason: vetoFails.map(c => c.court_id) };
  }
  const allPass = courtResults.every(c => c.verdict === 'PASS' || !c.veto_power);
  return {
    verdict: allPass ? 'APPROVED' : 'DEFERRED',
    courts_passed: courtResults.filter(c => c.verdict === 'PASS').length,
    courts_total: courtResults.length,
  };
}
```

**Gate:** `regression_court_pipeline01_full_suite`
- Verifies all 7 courts are invoked
- Verifies veto logic works (FAIL from veto court -> REJECTED)
- Determinism x2 on court pipeline

### 5.4 Phase 3: Paper Trading (30+ Days)

**Paper Trading Contract:**

```
Minimum Duration:  30 calendar days
Minimum Trades:    100 trades
Strategy:          Court-approved (Phase 2 APPROVED verdict)
Exchange:          Testnet (Binance Futures Testnet or Bybit Testnet)
Capital:           Virtual $10,000 (testnet funds)
Position Limits:   Max 1 concurrent position
Risk Controls:     RiskGovernor with paper-mode limits
```

**Daily Checkpoint Protocol:**

```json
{
  "schema_version": "1.0.0",
  "checkpoint_date": "2026-04-01",
  "session_id": "paper_001",
  "day_number": 17,
  "metrics": {
    "cumulative_trades": 47,
    "cumulative_pnl_usd": 234.56,
    "running_sharpe": 0.82,
    "max_drawdown_pct": 8.3,
    "win_rate": 0.55,
    "avg_trade_duration_hours": 4.2
  },
  "daily_trades": [
    {
      "trade_id": "t_047",
      "symbol": "BTCUSDT",
      "side": "LONG",
      "entry_price": 87500.00,
      "exit_price": 87850.00,
      "pnl_usd": 35.00,
      "duration_hours": 3.5,
      "slippage_bps": 2.1
    }
  ],
  "sha256_previous": "<hash_of_previous_checkpoint>",
  "sha256_current": "<hash_of_this_checkpoint>"
}
```

**SHA256 Chain:**

```
Checkpoint Day 1
  sha256: abc123...
    |
Checkpoint Day 2
  sha256_previous: abc123...
  sha256: def456...
    |
Checkpoint Day 3
  sha256_previous: def456...
  sha256: ghi789...
    |
  ...
```

This creates an immutable evidence chain. Any tampering breaks the chain.

**Candidate FSM Transition: CT02 (BACKTESTED -> PAPER_PROVEN)**

Guards:
- `guard_paper_metrics`:
  - trades >= 100
  - Sharpe > 0.5
  - max_drawdown < 15%
  - days >= 30
  - sha256_chain_valid == true

**Gate:** `regression_paper01_evidence_chain`

### 5.5 Phase 4: Governance Review

**Governance FSM Transitions:**

```
DRY_RUN -> LIVE_TESTNET
  Guard: paper_proven == true
  Approval: Owner documented sign-off
  Evidence: Paper trading summary + court verdicts

LIVE_TESTNET -> CANARY_LIVE
  Guard: testnet_clean == true (no critical failures in 7 days)
  Approval: Owner documented sign-off
  Evidence: Testnet run summary

CANARY_LIVE -> LIVE
  Guard: canary_clean == true (no catastrophic failure in 7+ days)
  Approval: Owner documented sign-off + risk review
  Evidence: Canary run summary + P&L report
```

**Governance Decision Document:**

```markdown
# GOVERNANCE DECISION: DRY_RUN -> LIVE_TESTNET

Date: YYYY-MM-DD
Candidate: s1_breakout_atr
Decision: APPROVED / REJECTED

## Evidence Reviewed
- Paper trading: 30 days, 112 trades
- Sharpe: 0.82 (above 0.5 threshold)
- Max drawdown: 8.3% (below 15% threshold)
- Court verdicts: 7/7 PASS
- SHA256 chain: verified (30 links)

## Risk Assessment
- Estimated max loss (micro-live): $25
- Kill switch: operational
- Circuit breaker: configured (3 consecutive losses)

## Approval
Approved by: DRtishev
Signature: [signed]
```

**Gate:** `regression_gov01_transition_documented`

### 5.6 Phase 5: Micro-Live Canary

**Canary Configuration:**

```json
{
  "schema_version": "1.0.0",
  "canary_id": "canary_001",
  "strategy": "s1_breakout_atr",
  "exchange": "binance_futures",
  "mode": "CANARY",
  "limits": {
    "max_capital_usd": 25,
    "max_position_usd": 25,
    "max_trades_per_day": 1,
    "max_concurrent_positions": 1,
    "max_daily_loss_usd": 5,
    "max_total_loss_usd": 15,
    "circuit_breaker_consecutive_losses": 3
  },
  "duration_days": 7,
  "kill_switch": {
    "enabled": true,
    "method": "manual + automatic",
    "auto_triggers": [
      "daily_loss > max_daily_loss_usd",
      "total_loss > max_total_loss_usd",
      "consecutive_losses >= circuit_breaker_consecutive_losses"
    ]
  }
}
```

**Canary Safety Architecture:**

```
Market Data Feed
    |
    v
Strategy Signal
    |
    v
+---------------------+
| PRE-TRADE SAFETY    |
| - Position limit    |
| - Daily trade count |
| - Capital check     |
| - Kill switch check |
+---------------------+
    |
    v (only if ALL pass)
Order Placement (MAINNET)
    |
    v
Fill Detection (FillProbe)
    |
    v
+---------------------+
| POST-TRADE SAFETY   |
| - Reconciliation    |
| - P&L update        |
| - Drawdown check    |
| - Circuit breaker   |
+---------------------+
    |
    v
EventBus Logging
    |
    v
Daily Checkpoint (SHA256 chain)
```

**Candidate FSM Transition: CT03 (PAPER_PROVEN -> CANARY_DEPLOYED)**

Guards:
- `guard_canary_ready`:
  - risk_score < 0.3
  - governance_approved == true
  - kill_switch_tested == true
  - testnet_clean_days >= 7

**Candidate FSM Transition: CT04 (CANARY_DEPLOYED -> GRADUATED)**

Guards:
- `guard_graduation_court` (5 formal exams):
  1. EVIDENCE_COMPLETENESS: backtest + paper + canary metrics
  2. PERFORMANCE_THRESHOLD: Sharpe >= 0.5, DD <= 20%, profit_factor >= 1.0
  3. REALITY_GAP: live/paper Sharpe ratio >= 0.7
  4. RISK_ASSESSMENT: risk_score < 0.3, CB trips <= max
  5. BEHAVIORAL_AUDIT: no anomalous patterns

**Gate:** `regression_canary01_safety_controls`

---

## 6. Patch Plan

### Phase 1: Acquire + Lock (Days 1-5)

```
1.1  Complete capsule acquisition (if not done in Sprint 2)
     Mode: RESEARCH
     Output: All capsules locked

1.2  Verify capsule integrity x2
     Mode: CERT
     Gate: regression_capsule_lock01_integrity
```

### Phase 2: Offline Replay + Courts (Days 3-7)

```
2.1  Run full 7-court pipeline on all candidates
     Mode: CERT
     Output: Court verdicts per candidate
     Gate: regression_court_pipeline01_full_suite

2.2  Generate proof-of-work evidence
     Output: reports/evidence/EPOCH-SPRINT3-COURTS-<RUN_ID>/
```

### Phase 3: Paper Trading (Days 7-45)

```
3.1  Deploy paper trading harness to testnet
     Strategy: Court-approved candidate(s)
     Duration: 30+ days continuous

3.2  Daily checkpoint collection
     Automated: SHA256 chain evidence
     Manual: Weekly review of metrics

3.3  Candidate FSM transition: CT02
     Guard: paper_metrics satisfied
     Evidence: Paper summary + checkpoint chain
```

### Phase 4: Governance Review (Days 45-47)

```
4.1  Prepare governance decision document
4.2  Owner review and approval
4.3  Governance FSM transition: DRY_RUN -> LIVE_TESTNET
```

### Phase 5: Micro-Live Canary (Days 47-60)

```
5.1  Deploy canary with extreme limits
     Capital: $5-25
     Trades: 1/day max

5.2  7-14 days live operation
     Daily monitoring + automatic kill switch

5.3  Candidate FSM transition: CT03 (if clean)

5.4  Graduation court: CT04 (if 5 exams pass)

5.5  Generate final evidence pack
     Output: reports/evidence/EPOCH-SPRINT3-LIVE-<RUN_ID>/
```

---

## 7. Verification Runbook

### Gate Summary

| Phase | Gate ID | Purpose |
|-------|---------|---------|
| 1 | RG_CAPSULE_LOCK01 | Capsule SHA256 integrity |
| 2 | RG_COURT_PIPE01 | 7-court pipeline complete |
| 2 | RG_REPLAY_REAL_X2 | Real data replay x2 |
| 3 | RG_PAPER01 | Evidence chain integrity |
| 4 | RG_GOV01 | Governance transition documented |
| 5 | RG_CANARY01 | Safety controls operational |

### Full Verification Sequence

```bash
# Phase 1:
npm run -s verify:capsule:integrity        # All capsules SHA256 valid

# Phase 2:
npm run -s verify:replay:x2                # Offline replay deterministic
npm run -s verify:courts:full              # 7-court pipeline, all candidates
npm run -s verify:fast                     # x2 PASS

# Phase 3 (daily during paper):
npm run -s verify:paper:checkpoint         # Daily SHA256 chain valid
npm run -s ops:doctor                      # Health maintained

# Phase 4:
npm run -s verify:governance:transition    # Approval documented

# Phase 5 (daily during canary):
npm run -s verify:canary:safety            # Limits enforced, kill switch tested
npm run -s ops:life                        # Organism alive

# Final:
npm run -s verify:fast                     # x2 PASS (all gates)
npm run -s ops:doctor                      # Scoreboard >= 70
```

---

## 8. Evidence Requirements

### Phase 2 Evidence

```
reports/evidence/EPOCH-SPRINT3-COURTS-<RUN_ID>/
  court_pipeline_results.json
  replay_determinism_x2.json
  candidate_verdicts/
    s1_breakout_atr.json
  SHA256SUMS.md
```

### Phase 3 Evidence

```
reports/evidence/EPOCH-SPRINT3-PAPER-<SESSION_ID>/
  paper_summary.json
  daily_checkpoints/
    checkpoint_day_001.json
    checkpoint_day_002.json
    ...
    checkpoint_day_030.json
  sha256_chain.json
  metrics_final.json
```

### Phase 5 Evidence

```
reports/evidence/EPOCH-SPRINT3-LIVE-<CANARY_ID>/
  canary_config.json
  daily_reports/
    day_001.json
    ...
    day_007.json
  pnl_summary.json
  safety_events.json
  graduation_court_verdict.json
  SHA256SUMS.md
  SUMMARY.md
```

---

## 9. Stop Rules

### PASS Criteria (FIRST DOLLAR)

- [ ] >= 2 data capsules: SHA256 locked and replay x2 verified
- [ ] 7-court pipeline: >= 1 candidate APPROVED
- [ ] Paper trading: 30+ days, 100+ trades, SHA256 chain valid
- [ ] Candidate FSM: at least 1 candidate at PAPER_PROVEN or beyond
- [ ] Governance: DRY_RUN -> LIVE_TESTNET transition approved
- [ ] Micro-live: 7+ days without catastrophic failure
- [ ] Kill switch: tested and operational
- [ ] ops:doctor: scoreboard >= 70 throughout
- [ ] verify:fast x2: PASS throughout
- [ ] FIRST DOLLAR: at least 1 real trade executed and settled

### ABORT Conditions

| Condition | Action | Severity |
|-----------|--------|----------|
| All strategies: BFM < 1.0x with real data | Abort Sprint 3; research new strategies | CRITICAL |
| Paper trading: max_drawdown > 25% | Abort paper; re-evaluate strategy | HIGH |
| Micro-live: total loss > $15 | Kill switch activated; review before restart | HIGH |
| Kill switch fails to activate | EMERGENCY STOP; fix before any live trading | CRITICAL |
| Circuit breaker trips 3x in 24h | Auto-halt; manual review required | HIGH |
| Exchange API breaking change | Pause live trading; update adapter | MEDIUM |
| ops:doctor scoreboard < 50 | Stop live trading; fix organism health | HIGH |

### Absolute Guardrails

These limits are **non-negotiable** and hardcoded:

| Guardrail | Value | Override |
|-----------|-------|----------|
| Max capital at risk | $25 | None (change requires new SDD) |
| Max daily loss | $5 | None |
| Max total loss | $15 | None |
| Max trades per day | 1 (initial) | Governance approval for increase |
| Kill switch | Always enabled | None |
| Circuit breaker | 3 consecutive losses | None |

---

## 10. Risk Register

| ID | Risk | P | I | Mitigation |
|----|------|---|---|------------|
| R3-01 | Real expectancy < simulated (reality gap) | High | Critical | Paper proving + canary limits; HOLD_STRICT if gap > 30% |
| R3-02 | Testnet != mainnet slippage/latency | Medium | High | Document differences; conservative eta; monitor live slippage |
| R3-03 | Exchange API changes during paper period | Medium | Medium | Version-lock API client; adapter pattern |
| R3-04 | Kill switch failure under stress | Low | Critical | Test kill switch daily; independent monitoring |
| R3-05 | SHA256 chain break (evidence corruption) | Low | High | Immutable checkpoint writes; backup chain |
| R3-06 | Governance approval delayed | Medium | Low | Pre-prepare decision document template |
| R3-07 | Micro-live max loss reached quickly | Medium | Low | Expected outcome with $25 limit; learning value > monetary loss |
| R3-08 | Strategy overfits to paper period | Medium | High | Monitor regime changes; out-of-sample validation |
| R3-09 | Emotional override of HOLD_STRICT verdict | Medium | Critical | Automated enforcement; governance FSM prevents manual bypass |
| R3-10 | Total system failure during live trade | Low | High | Positions auto-close on disconnect; exchange stop-loss orders |

---

## 11. Acceptance Criteria

### Definition of Done (DoD)

```
Sprint 3 is DONE when:

1. ALL Stop Rules PASS criteria satisfied
2. At least 1 strategy has traversed:
   DRAFT -> BACKTESTED -> PAPER_PROVEN -> CANARY_DEPLOYED
3. Paper trading evidence: 30+ days, 100+ trades, SHA256 chain valid
4. Micro-live canary: 7+ days, no catastrophic failure
5. At least 1 real trade executed and settled on mainnet
6. Governance FSM: DRY_RUN -> LIVE_TESTNET transition approved
7. Kill switch tested and verified operational
8. All evidence packs complete with SHA256 chains
9. Reality gap (live/paper Sharpe ratio) documented
10. Final SUMMARY.md with honest verdict
```

### Post-Sprint 3 Decision Matrix

| Outcome | Next Action |
|---------|------------|
| Canary profitable + reality gap < 30% | Scale: increase limits, add strategies |
| Canary breakeven + reality gap < 50% | Continue canary; gather more data |
| Canary small loss + reality gap > 50% | Investigate gap; refine model |
| Canary significant loss | HOLD_STRICT; research new approach |
| Kill switch activated | Review, fix root cause, restart canary |

### Estimated Duration

**1-2 months** (30+ days paper + 7-14 days canary + infrastructure)

### ONE_NEXT_ACTION

```bash
# Verify capsule integrity before replay
npm run -s verify:capsule:integrity
```

---

## Appendix A: Candidate FSM State Diagram

```
              DRAFT
                |
         CT01 (backtest x2)
                |
                v
           BACKTESTED
                |
         CT02 (100+ trades, 30+ days,
               Sharpe > 0.5, DD < 15%)
                |
                v
          PAPER_PROVEN --------+
                |              |
         CT03 (risk < 0.3,     |
              governance OK)   |
                |              |
                v              |
        CANARY_DEPLOYED        |
                |              |
         CT04 (5 exams PASS,   |
              graduation       |
              court)           |
                |              |
                v              |
           GRADUATED           |
                               |
         +--- CT05 (any) -> PARKED
         +--- CT07 (any) -> REJECTED
         +--- CT08 (any) -> QUARANTINED
                              |
                        CT09 -> PARKED
                        CT10 -> REJECTED
```

## Appendix B: Safety Control Matrix

| Control | Paper | Canary | Graduated |
|---------|-------|--------|-----------|
| Capital limit | Virtual $10K | $25 real | Governance-defined |
| Position limit | 1 concurrent | 1 concurrent | Fleet policy |
| Daily trade limit | Unlimited | 1/day | Fleet policy |
| Daily loss limit | Report only | $5 auto-halt | Governance-defined |
| Total loss limit | Report only | $15 auto-halt | Governance-defined |
| Kill switch | N/A | Always on | Always on |
| Circuit breaker | Log only | 3 losses -> halt | 3 losses -> halt |
| Risk governor | Enabled | Enabled + strict | Enabled |
| Evidence chain | Daily checkpoint | Daily checkpoint | Daily checkpoint |

---

*Generated: 2026-03-03 | Mode: CERT (offline) | Parent: SDD-000 | Predecessor: SDD-003*
