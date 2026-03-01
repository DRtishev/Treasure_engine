# REGRESSION_OB_OKX14.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3053d6c7678c
NEXT_ACTION: npm run -s verify:regression:ob-okx14-align-determinism-x2

## POLICY
- Align engine must produce byte-identical ALIGN.json on repeated runs
- No time-derived fields in ALIGN.json (tick-only requirement)

## CHECKS
- [PASS] align_script_exists: align script present — OK
- [PASS] align_run1_exit_zero: run1 EC=0 — OK
- [PASS] align_run2_exit_zero: run2 EC=0 — OK
- [PASS] align_output_deterministic_x2: ALIGN.json hash run1===run2=408414da7d550e67... — deterministic OK
- [PASS] align_stdout_pass_line_identical: stdout [PASS] line identical — OK
- [PASS] align_json_no_time_fields: ALIGN.json has no ts/timestamp/time fields — tick-only OK

## FAILED
- NONE
