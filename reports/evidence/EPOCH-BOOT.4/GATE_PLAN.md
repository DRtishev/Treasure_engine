# GATE PLAN (EPOCH-BOOT.4)
1) npm ci
2) npm run verify:paper (run #1)
3) npm run verify:paper (run #2)
4) npm run verify:e2 (run #1)
5) npm run verify:e2 (run #2)
6) npm run verify:e2:multi
7) npm run verify:phase2
8) npm run verify:integration
9) sha256sum -c reports/evidence/EPOCH-BOOT.4/SHA256SUMS.SOURCE.txt
10) npm run verify:core
