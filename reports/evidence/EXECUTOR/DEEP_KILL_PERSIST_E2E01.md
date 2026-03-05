# RG_KILL_PERSIST_E2E01: Kill Switch Persistence E2E

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
CHECKS: 5
VIOLATIONS: 0

- [PASS] flatten_triggers_and_pauses: OK: FLATTEN triggered, orders paused
- [PASS] checkpoint_saved: OK: checkpoint saved to store
- [PASS] state_recovered_after_restart: OK: ordersPaused=true after restart
- [PASS] lastAction_preserved: OK: lastAction=FLATTEN
- [PASS] reset_state_persisted: OK: ordersPaused=false after reset+restart
