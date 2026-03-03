# COMMAND_LOG — Treasure Engine Audit
Дата: 2026-03-03

## Все выполненные команды

| # | Команда | EC | Краткий итог |
|---|---------|----|----|
| 1 | `git branch --show-current` | 0 | claude/treasure-engine-audit-u4X28 |
| 2 | `git rev-parse HEAD` | 0 | bdbf61f4aabe31a5d8d5ee1e8489f5e92896f578 |
| 3 | `git status -sb` | 0 | clean |
| 4 | `node -v` | 0 | v22.22.0 |
| 5 | `npm -v` | 0 | 10.9.4 |
| 6 | `test -d node_modules` | 1 | MISSING |
| 7 | `test -f artifacts/incoming/ALLOW_NETWORK` | 1 | NOT FOUND |
| 8 | `test -f artifacts/incoming/APPLY_AUTOPILOT` | 1 | NOT FOUND |
| 9 | `npm install --prefer-offline` | 0 | 45 packages, 1 moderate vuln (ajv ReDoS) |
| 10 | `npm run -s verify:fast` (run 1) | 2 | BLOCKED — ACQ_LOCK01 (node_toolchain_ensure) |
| 11 | `npm run -s verify:fast` (run 2) | 2 | BLOCKED — ACQ_LOCK01 (идентично run 1) |
| 12 | `npm run -s ops:life` | 1 | CRASH — EVT_SCHEMA_ERROR: budget_ms matches timestamp pattern |
| 13 | `npm run -s ops:doctor` | 1 | FAIL — STARTUP: BOOT_FAIL (verify:fast заблокирован) |
| 14 | `npm run -s ops:cockpit` | 0 | PASS — fsm=CERTIFYING, readiness=NEEDS_DATA |
| 15 | `npm run -s ops:timemachine` | 0 | PASS |
| 16 | `npm run -s ops:autopilot` | 0 | PASS — DRY_RUN, mode=LIFE |
| 17 | `npm audit` | 1 | 1 moderate: ajv ReDoS (GHSA-2g4f-4pwh-qvx6) |
| 18 | `npm run -s verify:regression:fsm01-no-skip-states` | 0 | PASS |
| 19 | `npm run -s verify:regression:fsm02-consciousness` | 0 | PASS |
| 20 | `npm run -s verify:regression:immune01-integration` | 0 | PASS |
| 21 | `npm run -s verify:regression:metaagent01-fleet` | 0 | PASS |
| 22 | `npm run -s verify:regression:san01-global-forbidden-apis` | 0 | PASS |
| 23 | `npm run -s verify:regression:backtest01-organ-health` | 0 | PASS |
| 24 | `npm run -s verify:regression:agent01-agents-present` | 0 | PASS |
| 25 | `npm run -s verify:regression:agent02-claude-md-drift` | 0 | PASS |
| 26 | `npm run -s verify:regression:time01-stable-tick-order` | 0 | PASS |
| 27 | `npm run -s verify:regression:time02-no-time-fields` | 0 | PASS |
| 28 | `npm run -s verify:regression:auto01-mode-router` | 0 | PASS |
| 29 | `npm run -s verify:regression:cert-executor-write-forbidden` | 0 | PASS |
| 30 | `npm run -s verify:regression:net-toolchain01-no-net-in-verify-fast` | 0 | FAIL (логический), EC=0 (аномалия!) |
| 31 | `npm run -s verify:regression:liq-lock01-normalized-hash-match` | 0 | PASS |
| 32 | `npm run -s verify:repo:byte-audit:x2` | 0 | PASS (3.2s) |
| 33 | `npm run -s verify:regression:node-truth-alignment` | 0 | PASS |
| 34 | `npm run -s verify:regression:churn-contract01` | 0 | PASS |
| 35 | `npm run -s verify:regression:netkill-ledger-enforcement` | 0 | PASS |
| 36 | `npm run -s verify:regression:pr01-evidence-bloat-guard` | 0 | PASS |
| 37 | `npm run -s verify:regression:life04-next-action-surfacing` | 0 | PASS |
