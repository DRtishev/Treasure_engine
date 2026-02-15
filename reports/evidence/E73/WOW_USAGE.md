# E73 WOW USAGE
- wow_fingerprint: 08031a689101166acd02adafbc75a1e39376c2582b5ee910b3ed8c9d40d4287e
- wow_usage_fingerprint: 3c9c1245bdbc759835f49fc41627aa5c885e35afb3f174d2f91f8141acb9fd1e
- WOW_USED: [W-0001, W-0004, W-0008]

## W-0001
- trace:
  - where: scripts/verify/e73_edge_contract_x2.mjs
  - anchor: law-evaluator
  - why: deterministic contract evaluation path
## W-0004
- trace:
  - where: scripts/verify/e73_contract_court.mjs
  - anchor: contract-court
  - why: contract evolution governance trace
## W-0008
- trace:
  - where: reports/evidence/E73/EDGE_CONTRACT.md
  - anchor: budget-summary
  - why: allowed-fail budget reporting trace
