# GATE PLAN (EPOCH-BOOT.1)
1) `npm ci`
2) `npm run verify:e2` (run #1)
3) `npm run verify:phase2`
4) `npm run verify:paper` (run #1)
5) `npm run verify:e2` (run #2)
6) `npm run verify:paper` (run #2)
7) `npm run verify:e2:multi` (3 seeds + internal repeat)
8) `npm run verify:integration`
9) `npm run verify:binance` (default skip)
10) `npm run verify:websocket` (default skip)
11) `sha256sum -c reports/evidence/EPOCH-BOOT.1/SHA256SUMS.SOURCE.txt`
