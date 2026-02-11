# GATE PLAN — EPOCH-26

1. `npm ci`
2. `npm run verify:epoch26` (run #1)
3. `npm run verify:epoch26` (run #2 / anti-flake)
4. `npm run verify:core`
5. `npm run verify:phase2`
6. `npm run verify:integration`
7. `EVIDENCE_DIR=reports/evidence/EPOCH-26 npm run regen:manifests`
8. `sha256sum -c reports/evidence/EPOCH-26/SHA256SUMS.SOURCE.txt`
9. `sha256sum -c reports/evidence/EPOCH-26/SHA256SUMS.EVIDENCE.txt`

Policy notes:
- Offline-first; network checks remain opt-in.
- No live orders; synthetic governance drill only.
- All gate logs are persisted under `reports/evidence/EPOCH-26/gates/`.
