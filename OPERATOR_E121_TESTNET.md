# OPERATOR E121 TESTNET RUNBOOK

## Secrets and env setup
- Export API keys via env only (`BYBIT_API_KEY`, `BYBIT_API_SECRET`).
- Never place credentials in files or evidence markdown.

## Required unlock flags for real order
- `ENABLE_NET=1`
- `I_UNDERSTAND_LIVE_RISK=1`
- `ONLINE_REQUIRED=1`
- `LIVE_PLACE_ORDER=1`
- `DRY_RUN=0`
- `UPDATE_E121_EVIDENCE=1`

## Safety defaults
- `MAX_NOTIONAL_USD=25`
- `MAX_LOSS_USD_PER_DAY=5`
- `MAX_TRADES_PER_DAY=1`
- `COOLDOWN_SEC=60`
- `MAX_SPREAD_BPS=20`
- `MAX_SLIPPAGE_BPS=15`

## Command sequence
```bash
CI=false ONLINE_REQUIRED=1 ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 LIVE_PLACE_ORDER=1 DRY_RUN=0 UPDATE_E121_EVIDENCE=1 npm run -s verify:e121
CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e121
npm run -s verify:e121:contracts
CI=false UPDATE_E121_EVIDENCE=1 npm run -s verify:e121:seal_x2
CI=false OFFLINE_ONLY=1 npm run -s verify:e121:replay_x2
```

## Rollback
- Revert the commit that introduced E121 evidence and scripts:
```bash
git revert <commit_sha>
```

## WARN vs FULL
- `FULL` requires at least one normalized live execution outcome (`filled` or `partially_filled`).
- `WARN` is expected when operating in `ONLINE_OPTIONAL` with fallback/no fill.

## Proof files for real fill
- `reports/evidence/E121/MICRO_LIVE_RUN.md` (`live_success_count > 0`)
- `reports/evidence/E121/EXECUTION_ADAPTER.md` (`status: filled|partially_filled`)
- `reports/evidence/E121/VERDICT.md` (`status: FULL` only with successful live fill)
- redaction enforced via `scripts/verify/e121_contract_redaction.mjs`.
