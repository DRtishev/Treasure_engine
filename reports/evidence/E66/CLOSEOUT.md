# E66 CLOSEOUT

- commit: b8a00ca
- utc: 2026-02-14T17:35:01.886Z
- mode: update ritual
- commands:
  - CI=false UPDATE_CAS=1 UPDATE_PROVENANCE=1 UPDATE_E66_EVIDENCE=1 APPROVE_SNAPSHOTS=1 npm run -s verify:e66
  - CI=false UPDATE_E66_EVIDENCE=1 npm run -s verify:phoenix:x2

- evidence_fingerprint: 2d960f37e10efe960433572c48f8bdb36f152716c417a418dc960a3eb1d9f331
- links:
  - VERDICT.md
  - RUNS_VERIFY.md
  - RUNS_X2.md
  - SHA256SUMS.md
  - PROVENANCE.md
  - CAS.md
