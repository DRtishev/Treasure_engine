# E73 CLOSEOUT

- chain_mode: FAST_PLUS
- strict_laws: 1
- chain_bundle_fingerprint: 74dda04fab6e42bc0fe396aa3f35cfa8a7c0ec9358f485662ec11042a7080612
- commands:
  - npm ci
  - CI=false UPDATE_E73_EVIDENCE=1 CHAIN_MODE=FAST_PLUS npm run -s verify:e73
- canonical_fingerprint: d04865b98ce6bf1bb18e5d5bd828d4e748242143a44fdbb4c97e38c31d817783
- links:
  - MATERIALS.md
  - WOW_USAGE.md
  - CONTRACT_COURT.md
  - CONTRACT_DIFF.md
  - CONTRACT_CHANGELOG.md
  - EDGE_CONTRACT.md
  - RUNS_EDGE_CONTRACT_X2.md
  - SHA256SUMS.md
