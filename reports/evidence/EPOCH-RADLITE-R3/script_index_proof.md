# R3.2 Script Index Proof

## Gate: RG_SCRIPT_INDEX_FAST01

### Implementation

- `scripts/ops/script_index.mjs`: Scans scripts/verify/ and scripts/ops/ for .mjs/.sh files
- Extracts metadata: filename, purpose (from JSDoc/comments), npm script name
- Generates `artifacts/script_index.json`
- Uses deterministic timestamp (SAN01-compliant, no Date.now())

### Output

- 1046 scripts indexed
- Categories: verify, regression, ops
- Each entry: file path, npm script name, purpose, category

### Evidence

- Gate verifies: index file exists, total_scripts>0, count matches reality ±10, categories present

### Verdict: PASS
