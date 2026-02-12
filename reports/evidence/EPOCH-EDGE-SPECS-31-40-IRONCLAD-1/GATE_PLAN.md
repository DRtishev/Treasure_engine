# Gate Plan
1. Install deterministic workspace dependencies with `npm ci`.
2. Run `npm run verify:specs` twice (anti-flake).
3. Capture logs under `gates/verify_specs_run{1,2}.log`.
4. Publish verdict only if both runs PASS.
