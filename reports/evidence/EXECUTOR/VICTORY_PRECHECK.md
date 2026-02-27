# VICTORY_PRECHECK.md

STATUS: BLOCKED
REASON_CODE: CHURN01
RUN_ID: be213b42d54a
NEXT_ACTION: npm run -s epoch:victory:seal

- baseline_clean_ec: 0
- baseline_precheck_ok: true
- clean_tree_ok: false
- drift_detected: true
- drift_severity: HIGH
- snap_reason_code: CHURN01
- dirty_tracked_n: 5
- dirty_staged_n: 0
- dirty_untracked_n: 4
- offenders_outside_allowed_roots_n: 9

## DIRTY_TRACKED_FILES (max 50 shown)
- package.json
- reports/evidence/EXECUTOR/gates/manual/node_toolchain_acquire.json
- reports/evidence/EXECUTOR/NODE_TOOLCHAIN_ACQUIRE.md
- scripts/executor/executor_epoch_victory_seal.mjs
- scripts/ops/node_authority_run.sh

## DIRTY_STAGED_FILES (max 50 shown)
- NONE

## DIRTY_UNTRACKED_FILES (max 50 shown)
- reports/evidence/RG_NODEAUTH_DONE_03/logs/epoch_victory_seal.log
- reports/evidence/RG_NODEAUTH_DONE_03/logs/node_toolchain_acquire.log
- scripts/verify/regression_churn_write_scope_guard.mjs
- scripts/verify/regression_node_churn_receipt_routing.mjs

## OFFENDERS_OUTSIDE_ALLOWED_ROOTS (max 50 shown)
- package.json
- reports/evidence/EXECUTOR/gates/manual/node_toolchain_acquire.json
- reports/evidence/EXECUTOR/NODE_TOOLCHAIN_ACQUIRE.md
- reports/evidence/RG_NODEAUTH_DONE_03/logs/epoch_victory_seal.log
- reports/evidence/RG_NODEAUTH_DONE_03/logs/node_toolchain_acquire.log
- scripts/executor/executor_epoch_victory_seal.mjs
- scripts/ops/node_authority_run.sh
- scripts/verify/regression_churn_write_scope_guard.mjs
- scripts/verify/regression_node_churn_receipt_routing.mjs

### Baseline Clean Telemetry (SEMANTIC)
- baseline_files_restored_n: 41
- baseline_evidence_removed_n: 24

### Baseline Clean Telemetry (VOLATILE)
- baseline_clean_elapsed_ms: 0

## BASELINE_CLEAN_OUTPUT
```
⚠️ LOCAL MODIFICATIONS DETECTED
Running victory seal will restore tracked files.
Uncommitted changes may be lost.

Commit or stash before continuing.

BASELINE_TELEMETRY_JSON:{"semantic":{"baseline_files_restored_n":41,"baseline_evidence_removed_n":24},"volatile":{"baseline_clean_elapsed_ms":0}}
[PASS] executor_clean_baseline — NONE
```

## GIT_STATUS_SB
```
## work
 M package.json
 M reports/evidence/EXECUTOR/NODE_TOOLCHAIN_ACQUIRE.md
 M reports/evidence/EXECUTOR/gates/manual/node_toolchain_acquire.json
 M scripts/executor/executor_epoch_victory_seal.mjs
 M scripts/ops/node_authority_run.sh
?? reports/evidence/RG_NODEAUTH_DONE_03/
?? scripts/verify/regression_churn_write_scope_guard.mjs
?? scripts/verify/regression_node_churn_receipt_routing.mjs
```

## GIT_DIFF_NAME_ONLY
```
package.json
reports/evidence/EXECUTOR/NODE_TOOLCHAIN_ACQUIRE.md
reports/evidence/EXECUTOR/gates/manual/node_toolchain_acquire.json
scripts/executor/executor_epoch_victory_seal.mjs
scripts/ops/node_authority_run.sh
```

## GIT_DIFF_CACHED_NAME_ONLY
```
(none)
```

### CHURN01: WRITE_SCOPE_GUARD violation

Detected:
- tracked: 5
- staged: 0
- untracked: 4

#### Quick Fix Options

A) discard untracked
   git clean -fd

B) restore changes
   git restore --staged .
   git restore .

C) commit drift
   git add -A
   git commit -m "chore: reconcile drift"

Then run:
npm run -s epoch:victory:seal
