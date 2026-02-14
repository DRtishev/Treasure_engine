# E66 CLOSEOUT

- commit: 8e356e7
- utc: 2026-02-14T18:09:31.666Z
- mode: update ritual
- commands:
  - CI=false UPDATE_CAS=1 UPDATE_PROVENANCE=1 APPROVE_SNAPSHOTS=1 npm run -s verify:e66
  - CI=false UPDATE_E66_EVIDENCE=1 npm run -s verify:phoenix:x2

- canonical_fingerprint: 01417c07d2586d2e71bf0e31f8ab07d0bb48b765312db15964bf30d5295317b1
- links:
  - RUNS_VERIFY.md
  - RUNS_X2.md
  - SHA256SUMS.md
  - CHECKLIST.md
  - PROVENANCE.md
  - CAS.md
