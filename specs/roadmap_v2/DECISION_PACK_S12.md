# Decision Pack — Sprint 12: Micro-Live Canary

## Context
S11 proved paper burn-in works E2E with ledger reconciliation.
S12 proves canary policy works in micro_live stage (the first real-money stage).

## Wiring Strategy
1. **Canary session E2E** (deep gate): Run `runPaperLiveLoop` with `stage='micro_live'` and tight canary limits
   - Verify canary events include PAUSE or FLATTEN actions
   - Generate per-session receipt with canary event log
2. **RUNBOOK update**: Add micro_live operating procedures section
3. **Fast gate**: Static check that RUNBOOK has micro_live section and session receipt format is documented

## Risk
- micro_live is the first real-money stage — canary MUST fire on violations
- If canary doesn't trigger, orders would execute without safety guardrails
- Fail-closed: canary returns PAUSE for missing metrics

## Decision
Prove canary enforcement by running with limits guaranteed to trigger (daily_loss_usd=0.01).
This validates that the safety mechanism works before any real money is at risk.
