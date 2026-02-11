# GATE PLAN

Ordered execution plan:
1. `npm ci`
2. `npm run verify:specs`
3. `npm run verify:paper` (x2)
4. `npm run verify:e2` (x2)
5. `npm run verify:e2:multi`
6. `npm run verify:phase2`
7. `npm run verify:integration`
8. `npm run verify:epoch17`
9. `npm run verify:epoch18`
10. `npm run verify:epoch19`
11. `npm run verify:monitoring` (x2)
12. `npm run verify:epoch20`
13. `npm run verify:epoch21`
14. `npm run verify:release-governor` (x2)
15. `npm run export:validated`
16. `npm run regen:manifests`
17. `sha256sum -c reports/evidence/EPOCH-BOOT.AUTOPILOT/SHA256SUMS.SOURCE.txt`
18. `sha256sum -c reports/evidence/EPOCH-BOOT.AUTOPILOT/SHA256SUMS.EVIDENCE.txt`

Policy notes:
- Offline-first default.
- Any network checks require `ENABLE_NETWORK_TESTS=1` and are excluded from this wall.
