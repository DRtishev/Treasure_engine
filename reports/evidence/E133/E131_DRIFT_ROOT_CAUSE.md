# E133 E131 DRIFT ROOT CAUSE
- cause_1: e131_run wrote ZERO_WRITES_ON_FAIL.md into canonical E131 on failure path
- cause_2: e131_diag wrote canonical files when UPDATE_E131_EVIDENCE=1, including ONLINE_REQUIRED negative paths
- cause_3: protected snapshot omitted reports/evidence/E131, so zero-writes gate did not guard canonical pack
