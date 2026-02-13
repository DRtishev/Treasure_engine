# Gate Plan
1. Baseline before edits: npm ci, verify:specs x2, verify:edge x2
2. Drift audit against SSOT/specs/ledger
3. Implement minimal fixes (ledger semantics + deterministic packaging + hardening if needed)
4. Full rerun: npm ci, verify:specs x2, verify:edge x2
