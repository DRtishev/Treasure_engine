# GATE PLAN (EPOCH-22)

1. `npm ci`
2. `npm run verify:epoch22`
3. `npm run verify:epoch22` (anti-flake repeat)
4. `npm run verify:core`
5. `npm run verify:phase2`
6. `npm run verify:integration`
7. `npm run verify:wall`
8. `npm run regen:manifests`
9. `sha256sum -c reports/evidence/EPOCH-22/SHA256SUMS.SOURCE.txt`
10. `sha256sum -c reports/evidence/EPOCH-22/SHA256SUMS.EVIDENCE.txt`

Network policy: no network gates in this cycle.
