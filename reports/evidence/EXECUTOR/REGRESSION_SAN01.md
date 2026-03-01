# REGRESSION_SAN01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 7b26add1c824
NEXT_ACTION: npm run -s verify:regression:san01-global-forbidden-apis

## SCAN_SCOPE
- scripts/ops/*.mjs
- scripts/edge/data_organ/*.mjs

## ALLOWLIST
- scripts/ops/node_toolchain_acquire.mjs (double-key acquire)

## FORBIDDEN_TIME_APIS
- `Date.now()`
- `new Date(`
- `process.hrtime`
- `performance.now()`

## FORBIDDEN_NET_APIS
- `fetch(`
- `node:http import`
- `node:https import`
- `node:net import`
- `node:tls import`
- `node:dns import`
- `new WebSocket(`
- `from 'ws' import`
- `from 'undici' import`
- `from 'axios' import`
- `from 'node-fetch' import`

## VIOLATIONS
time_violations_n: 0
net_violations_n: 0
- NONE

## CHECKS
- [PASS] clean_autopilot_court_v2_mjs: scripts/ops/autopilot_court_v2.mjs — no forbidden APIs
- [PASS] clean_build_final_validated_mjs: scripts/ops/build_final_validated.mjs — no forbidden APIs
- [PASS] clean_candidate_registry_mjs: scripts/ops/candidate_registry.mjs — no forbidden APIs
- [PASS] clean_clean_clone_bootstrap_mjs: scripts/ops/clean_clone_bootstrap.mjs — no forbidden APIs
- [PASS] clean_cockpit_mjs: scripts/ops/cockpit.mjs — no forbidden APIs
- [PASS] clean_event_schema_v1_mjs: scripts/ops/event_schema_v1.mjs — no forbidden APIs
- [PASS] clean_eventbus_v1_mjs: scripts/ops/eventbus_v1.mjs — no forbidden APIs
- [PASS] clean_evidence_helpers_mjs: scripts/ops/evidence_helpers.mjs — no forbidden APIs
- [PASS] clean_life_mjs: scripts/ops/life.mjs — no forbidden APIs
- [PASS] allowlisted_node_toolchain_acquire.mjs: allowlisted (double-key acquire) — skip
- [PASS] clean_node_toolchain_ensure_mjs: scripts/ops/node_toolchain_ensure.mjs — no forbidden APIs
- [PASS] clean_node_truth_doctor_mjs: scripts/ops/node_truth_doctor.mjs — no forbidden APIs
- [PASS] clean_regen_manifests_mjs: scripts/ops/regen_manifests.mjs — no forbidden APIs
- [PASS] clean_timemachine_ledger_mjs: scripts/ops/timemachine_ledger.mjs — no forbidden APIs
- [PASS] clean_event_emitter_mjs: scripts/edge/data_organ/event_emitter.mjs — no forbidden APIs
- [PASS] total_violations_zero: 0 forbidden API usages across CERT-backbone

## FAILED
- NONE
