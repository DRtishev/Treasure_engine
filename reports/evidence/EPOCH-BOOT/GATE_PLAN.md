# Gate Plan (EPOCH-BOOT refresh #6)
1) `npm ci`
2) `npm run verify:safety`
3) `npm run verify:binance` (default policy skip)
4) `npm run verify:websocket` (default policy skip)
5) `npm run verify:e2` (run #1)
6) `npm run verify:e2` (run #2 anti-flake)
7) `npm run verify:phase2`
8) `npm run verify:paper` (run #1)
9) `npm run verify:paper` (run #2 anti-flake)
10) `npm run verify:integration`
11) `sha256sum -c reports/evidence/EPOCH-BOOT/SHA256SUMS.SOURCE.txt`
12) Rebuild checksums + release export hash files
