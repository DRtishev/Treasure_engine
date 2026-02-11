# GATE PLAN (EPOCH-25)

1. `npm ci`
2. `npm run verify:epoch25`
3. `npm run verify:epoch25` (anti-flake)
4. `npm run verify:core`
5. `npm run verify:phase2`
6. `npm run verify:integration`
7. `npm run export:validated`
8. `npm run regen:manifests` (boot refresh)
9. `npm run verify:wall`
10. `EVIDENCE_DIR=reports/evidence/EPOCH-25 npm run regen:manifests`
11. `sha256sum -c reports/evidence/EPOCH-25/SHA256SUMS.SOURCE.txt`
12. `sha256sum -c reports/evidence/EPOCH-25/SHA256SUMS.EVIDENCE.txt`

Network path remains opt-in only (`ENABLE_NETWORK_TESTS=1`).
