# VICTORY_TIMEOUT_TRIAGE.md

STATUS: BLOCKED
REASON_CODE: EC01
RUN_ID: a0e3806a2bb8
NEXT_ACTION: npm run -s epoch:victory:seal

- triage_mode: true
- timeout_step_index: NONE
- timeout_cmd: NONE

## STEPS
- step_1: npm run -s verify:regression:determinism-audit | ec=0 | timedOut=false | timeout_ms=180000
- step_2: npm run -s verify:regression:netkill-physics-full-surface | ec=0 | timedOut=false | timeout_ms=180000
- step_3: npm run -s verify:regression:node-options-preload-eviction | ec=0 | timedOut=false | timeout_ms=180000
- step_4: npm run -s verify:regression:net-kill-preload-hard | ec=0 | timedOut=false | timeout_ms=180000
- step_5: npm run -s verify:regression:net-kill-preload-path-safe | ec=0 | timedOut=false | timeout_ms=180000
- step_6: npm run -s verify:regression:executor-netkill-runtime-ledger | ec=0 | timedOut=false | timeout_ms=180000
- step_7: npm run -s epoch:foundation:seal | ec=1 | timedOut=false | timeout_ms=180000
