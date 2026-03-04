# RG_CANARY01_SAFETY_CONTROLS

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast
CHECKS_TOTAL: 8

## ABSOLUTE GUARDRAILS
- MAX_CAPITAL_USD: $25
- MAX_DAILY_LOSS_USD: $5
- MAX_TOTAL_LOSS_USD: $15
- MAX_TRADES_PER_DAY: 1
- CIRCUIT_BREAKER: 3 losses

## CHECKS
- [PASS] CANARY01_LIMITS_FROZEN: OK: frozen (threw: Cannot assign to read only property 'MAX_CAPITAL_USD' of object '#<Object>')
- [PASS] CANARY01_KILL_SWITCH_BLOCKS: OK: blocked by kill switch
- [PASS] CANARY01_OVERSIZE_BLOCKED: OK: $50 order rejected
- [PASS] CANARY01_CIRCUIT_BREAKER: OK: CB triggered after 3 losses
- [PASS] CANARY01_DAILY_LOSS_KILL: OK: daily loss $6 triggered kill
- [PASS] CANARY01_TOTAL_LOSS_KILL: OK: total loss $16 triggered kill
- [PASS] CANARY01_MANUAL_KILL: OK: manual kill active, trades blocked
- [PASS] CANARY01_DASHBOARD: OK: trades=2 W=1 L=1 PnL=$3
