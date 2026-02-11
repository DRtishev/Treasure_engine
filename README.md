# Treasure Engine

Deterministic verification baseline with Truth Layer evidence discipline.

## Prerequisites
- Node.js 20+
- npm 11+

## Install
```bash
npm ci
```

## Core offline gates
```bash
npm run verify:e2          # wrapped with run context, seed defaults to 12345
npm run verify:phase2
npm run verify:paper
npm run verify:integration
npm run verify:e2:multi    # multi-seed + anti-flake structural stability
```

## CI-friendly aggregate gates
```bash
npm run verify:core        # verify:e2 + verify:paper + verify:e2:multi
npm run verify:all         # backward-compatible project aggregate
```

## Expected outcomes
- `verify:e2`: generates run-scoped artifacts under `reports/runs/e2/<seed>/<repeat>/<run_id>/`.
- `verify:paper`: generates run-scoped artifacts under `reports/runs/paper/<seed>/<repeat>/<run_id>/` and validates run-local events.
- `verify:e2:multi`: checks schema validity, finite numbers, required report existence, and same-seed repeat structural stability.
- `verify:binance` / `verify:websocket`: skip by default unless `ENABLE_NETWORK_TESTS=1`.

## Truth checks
```bash
sha256sum -c reports/evidence/EPOCH-BOOT.1/SHA256SUMS.SOURCE.txt
```

## Troubleshooting
- If schema checks fail, inspect the latest run directory in `reports/runs/e2/` and logs in `reports/evidence/EPOCH-BOOT.1/gates/`.
- If paper verification fails, inspect `logs/events/` and `reports/evidence/EPOCH-BOOT.1/gates/verify_paper_*.log`.
- If network tests unexpectedly run, verify `ENABLE_NETWORK_TESTS` is unset.

## Planning
- Current implementation track is maintained in `TASK_TRACKER.md`.
