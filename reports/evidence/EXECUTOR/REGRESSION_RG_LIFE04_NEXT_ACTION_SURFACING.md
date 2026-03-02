# REGRESSION_RG_LIFE04_NEXT_ACTION_SURFACING.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

## CONTRACT
When ops:life S01 (verify:fast) is BLOCKED ACQ_LOCK01:
  - console prints stable line: ONE_NEXT_ACTION: npm run -s ops:node:toolchain:bootstrap
  - EPOCH-LIFE-*/LIFE_SUMMARY.json includes one_next_action field
  - EPOCH-LIFE-*/LIFE_SUMMARY.md NEXT_ACTION section uses the actionable command

## CHECKS
- [PASS] one_next_action_variable_present: oneNextAction variable declared — OK
- [PASS] reads_toolchain_ensure_json: reads node_toolchain_ensure.json receipt — OK
- [PASS] extracts_detail_next_action: extracts receipt.detail.next_action — OK
- [PASS] fallback_to_bootstrap_command: fallback "npm run -s ops:node:toolchain:bootstrap" present — OK
- [PASS] console_prints_one_next_action_line: console.log ONE_NEXT_ACTION: line present — OK
- [PASS] life_summary_json_has_one_next_action_field: one_next_action field in LIFE_SUMMARY.json — OK
- [PASS] life_summary_md_uses_one_next_action_var: LIFE_SUMMARY.md uses oneNextAction var — OK
- [PASS] extraction_restricted_to_s01_blocked: extraction restricted to S01 BLOCKED — OK
- [PASS] fail_soft_catch_present: fail-soft catch on receipt read — OK

## FAILED
- NONE
