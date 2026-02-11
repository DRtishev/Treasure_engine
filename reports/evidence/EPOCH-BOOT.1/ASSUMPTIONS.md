# ASSUMPTIONS (EPOCH-BOOT.1)
1. Network verification must stay disabled by default.
   - Check: `npm run verify:binance` / `npm run verify:websocket` should SKIP unless `ENABLE_NETWORK_TESTS=1`.
2. e2 artifacts can be isolated without breaking legacy checks by injecting `TREASURE_RUN_DIR`/`TREASURE_RUN_ID` via a wrapper.
   - Check: `npm run verify:e2` passes and writes under `reports/runs/e2/...`.
3. Same-seed repeated e2 runs should be structurally stable (schemas/files/fingerprints) even if numeric values vary across different seeds.
   - Check: `npm run verify:e2:multi` compares same-seed repeats.
4. SOURCE manifest must exclude generated evidence/reports/log outputs.
   - Check: generate from filtered tracked files and validate with `sha256sum -c`.
