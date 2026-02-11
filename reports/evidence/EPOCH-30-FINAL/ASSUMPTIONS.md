Assumptions ledger
- A1: Existing core gates are runnable offline.
  verify: npm run verify:core
- A2: Ledger/schema consumers accept extended epoch rows 01..30.
  verify: npm run verify:specs && npm run verify:release-governor
- A3: New epoch27..30 gates can run deterministically with SEED.
  verify: npm run verify:epoch27/28/29/30
- A4: Wall/governor can validate final evidence pack.
  verify: npm run verify:wall && npm run verify:release-governor
