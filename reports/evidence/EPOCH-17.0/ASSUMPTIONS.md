# Assumptions Ledger
1. verify:e2 consumes report paths that can be redirected to latest run dir.
2. existing canonical reports under reports/*.json are legacy and should not be overwritten.
3. deterministic run_id formula must be sha256(epoch+seed+hack_id), no randomness.
4. timestamps in canonical reports can come from deterministic RunContext clock.
5. source checksum manifest should only include tracked source files, excluding mutable evidence/log outputs.
