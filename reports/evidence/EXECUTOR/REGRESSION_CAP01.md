# REGRESSION_CAP01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 85923462b561
NEXT_ACTION: npm run -s verify:regression:cap01-capabilities-present

## CHECKS
- [PASS] capabilities_file_exists: specs/data_capabilities.json
- [PASS] capabilities_parseable: JSON parse OK
- [PASS] has_schema_version: schema_version=1.0.0
- [PASS] has_capabilities_object: providers=binance,bybit,okx
- [PASS] has_confidence_map: confidence_map present
- [PASS] confidence_map_has_coverage: coverage_keys=9
- [PASS] confidence_map_has_required_path_patterns: patterns_n=3

## FAILED
- NONE
