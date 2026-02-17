# E107 RISK GUARDRAILS

## Track 3: Kill-Switch Policy

### Policy Parameters
- max_position_usd: 5000 (max position value)
- max_daily_loss_pct: 2.0% (daily stop)
- max_total_loss_pct: 5.0% (panic exit)
- max_drawdown_pct: 3.0% (drawdown halt)
- max_fills_per_day: 100 (rate limit)
- panic_exit_on_error: true (fail-safe)

### Guardrail Levels
| Level | Trigger | Action |
| --- | --- | --- |
| WARN | max_fills_per_day | Skip trade, continue monitoring |
| CRITICAL | max_daily_loss, max_drawdown | Halt trading for the day |
| PANIC | max_total_loss | Immediate exit, close all positions |

### Fail-Safe Properties
- No state writes on failure: ledger only records successful fills
- Kill-lock: any critical failure arms E107 kill-lock
- Paper-only: no real funds at risk in E107

### Contract Verification
- e107_paper_live_contract.mjs: Tests guardrail behavior
- risk_guardrails_ok: Normal conditions pass
- risk_guardrails_max_fills: Fill limit triggers halt

## Verdict
PASS - Risk guardrails implemented and verified
