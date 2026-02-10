# Gate Plan (EPOCH-01)
1. Install deterministically with `npm ci`.
2. Run baseline gates:
   - `npm run verify:e2`
   - `npm run verify:phase2`
   - `npm run verify:paper`
3. Anti-flake reruns:
   - `npm run verify:e2`
   - `npm run verify:paper`
4. Capture logs and generate checksums/diff/export artifacts.
