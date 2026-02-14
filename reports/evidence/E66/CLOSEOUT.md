# E66 CLOSEOUT

- commit: 44f73c7
- utc: 2026-02-14T18:56:04.235Z
- mode: update ritual
- commands:
  - CI=false UPDATE_CAS=1 UPDATE_PROVENANCE=1 APPROVE_SNAPSHOTS=1 npm run -s verify:e66
  - CI=false UPDATE_E66_EVIDENCE=1 npm run -s verify:phoenix:x2

- canonical_fingerprint: a91dbeda87ea32b287f94053621ec09f5f399ab26f397d5f7f635668a8197232
- links:
  - RUNS_VERIFY.md
  - RUNS_X2.md
  - SHA256SUMS.md
  - CHECKLIST.md
  - PROVENANCE.md
  - CAS.md
