# E72 CLOSEOUT

- chain_mode: FAST_PLUS
- strict_laws: 1
- chain_bundle_fingerprint: 74dda04fab6e42bc0fe396aa3f35cfa8a7c0ec9358f485662ec11042a7080612
- commands:
  - npm ci
  - CI=false UPDATE_E72_EVIDENCE=1 CHAIN_MODE=FAST_PLUS npm run -s verify:e72
- canonical_fingerprint: 601aba2e29652a4ced82d7583731cd4d3450f0ea6b69e53d194b7b2294ba30e1
- links:
  - MATERIALS.md
  - WOW_USAGE.md
  - EDGE_CONTRACT.md
  - RUNS_EDGE_CONTRACT_X2.md
  - SHA256SUMS.md
