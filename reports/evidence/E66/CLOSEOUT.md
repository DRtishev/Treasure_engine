# E66 CLOSEOUT

- commit: ea16b59
- utc: 2026-02-14T18:37:37.788Z
- mode: update ritual
- commands:
  - CI=false UPDATE_CAS=1 UPDATE_PROVENANCE=1 APPROVE_SNAPSHOTS=1 npm run -s verify:e66
  - CI=false UPDATE_E66_EVIDENCE=1 npm run -s verify:phoenix:x2

- canonical_fingerprint: 0b76f364e69a75419124f77a09e957d1dbe96834a1182b99ac528abc6ac8907c
- links:
  - RUNS_VERIFY.md
  - RUNS_X2.md
  - SHA256SUMS.md
  - CHECKLIST.md
  - PROVENANCE.md
  - CAS.md
