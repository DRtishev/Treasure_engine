# GATE PLAN (EPOCH-23)

1. `npm ci`
2. `npm run verify:epoch23`
3. `npm run verify:epoch23` (anti-flake)
4. `npm run verify:core`
5. `npm run verify:phase2`
6. `npm run verify:integration`
7. `npm run regen:manifests` (boot refresh for wall integrity)
8. `npm run verify:wall`
9. `EVIDENCE_DIR=reports/evidence/EPOCH-23 npm run regen:manifests`
10. `sha256sum -c reports/evidence/EPOCH-23/SHA256SUMS.SOURCE.txt`
11. `sha256sum -c reports/evidence/EPOCH-23/SHA256SUMS.EVIDENCE.txt`

Offline-first; network gates not used.
