# REGRESSION_SAN01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
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
- [PASS] clean_candidate_fsm_mjs: scripts/ops/candidate_fsm.mjs — no forbidden APIs
- [PASS] clean_candidate_registry_mjs: scripts/ops/candidate_registry.mjs — no forbidden APIs
- [PASS] clean_clean_clone_bootstrap_mjs: scripts/ops/clean_clone_bootstrap.mjs — no forbidden APIs
- [PASS] clean_cockpit_mjs: scripts/ops/cockpit.mjs — no forbidden APIs
- [PASS] clean_doctor_mjs: scripts/ops/doctor.mjs — no forbidden APIs
- [PASS] clean_doctor_v2_mjs: scripts/ops/doctor_v2.mjs — no forbidden APIs
- [PASS] clean_event_schema_v1_mjs: scripts/ops/event_schema_v1.mjs — no forbidden APIs
- [PASS] clean_eventbus_v1_mjs: scripts/ops/eventbus_v1.mjs — no forbidden APIs
- [PASS] clean_evidence_helpers_mjs: scripts/ops/evidence_helpers.mjs — no forbidden APIs
- [PASS] clean_fsm_compensations_mjs: scripts/ops/fsm_compensations.mjs — no forbidden APIs
- [PASS] clean_fsm_guards_mjs: scripts/ops/fsm_guards.mjs — no forbidden APIs
- [PASS] clean_graduation_court_mjs: scripts/ops/graduation_court.mjs — no forbidden APIs
- [PASS] clean_heal_runner_mjs: scripts/ops/heal_runner.mjs — no forbidden APIs
- [PASS] clean_life_mjs: scripts/ops/life.mjs — no forbidden APIs
- [PASS] clean_metaagent_mjs: scripts/ops/metaagent.mjs — no forbidden APIs
- [PASS] clean_net_lock_mjs: scripts/ops/net_lock.mjs — no forbidden APIs
- [PASS] clean_net_unlock_mjs: scripts/ops/net_unlock.mjs — no forbidden APIs
- [PASS] allowlisted_node_toolchain_acquire.mjs: allowlisted (double-key acquire) — skip
- [PASS] clean_node_toolchain_bootstrap_mjs: scripts/ops/node_toolchain_bootstrap.mjs — no forbidden APIs
- [PASS] clean_node_toolchain_ensure_mjs: scripts/ops/node_toolchain_ensure.mjs — no forbidden APIs
- [PASS] clean_node_truth_doctor_mjs: scripts/ops/node_truth_doctor.mjs — no forbidden APIs
- [PASS] clean_proprioception_mjs: scripts/ops/proprioception.mjs — no forbidden APIs
- [PASS] clean_regen_manifests_mjs: scripts/ops/regen_manifests.mjs — no forbidden APIs
- [PASS] clean_replay_engine_mjs: scripts/ops/replay_engine.mjs — no forbidden APIs
- [PASS] clean_state_manager_mjs: scripts/ops/state_manager.mjs — no forbidden APIs
- [PASS] clean_timemachine_ledger_mjs: scripts/ops/timemachine_ledger.mjs — no forbidden APIs
- [PASS] clean_decimal_sort_mjs: scripts/edge/data_organ/decimal_sort.mjs — no forbidden APIs
- [PASS] clean_event_emitter_mjs: scripts/edge/data_organ/event_emitter.mjs — no forbidden APIs
- [PASS] core_allowlisted_engine_mjs: core/backtest/engine.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_master_system_mjs: core/control/master_system.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_court_v2_mjs: core/court/court_v2.mjs — 2 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_truth_integration_example_mjs: core/court/truth_integration_example.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_bybit_ws_mjs: core/data/providers/bybit_ws.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_kraken_ws_mjs: core/data/providers/kraken_ws.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_websocket_feed_mjs: core/data/websocket_feed.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_candidate_pipeline_mjs: core/edge/candidate_pipeline.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_fill_record_contract_mjs: core/edge/fill_record_contract.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_adversarial_safety_mjs: core/exec/adapters/adversarial_safety.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_adversarial_tester_mjs: core/exec/adapters/adversarial_tester.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_binance_client_mjs: core/exec/adapters/binance_client.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_live_adapter_mjs: core/exec/adapters/live_adapter.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_live_adapter_dryrun_mjs: core/exec/adapters/live_adapter_dryrun.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_mock_exchange_mjs: core/exec/adapters/mock_exchange.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_paper_adapter_mjs: core/exec/adapters/paper_adapter.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_safety_gates_mjs: core/exec/adapters/safety_gates.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_master_executor_mjs: core/exec/master_executor.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_safety_integrated_executor_mjs: core/exec/safety_integrated_executor.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_e112_cost_calibration_mjs: core/execution/e112_cost_calibration.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_e122_execution_adapter_v3_mjs: core/execution/e122_execution_adapter_v3.mjs — 2 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_approval_workflow_mjs: core/governance/approval_workflow.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_governance_engine_mjs: core/governance/governance_engine.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_mode_fsm_mjs: core/governance/mode_fsm.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_exchange_interface_mjs: core/live/exchange_interface.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_bybit_rest_testnet_mjs: core/live/exchanges/bybit_rest_testnet.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_feed_mjs: core/live/feed.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_anomaly_detector_mjs: core/ml/anomaly_detector.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_safety_monitor_mjs: core/monitoring/safety_monitor.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_e129_transport_dialer_mjs: core/net/e129_transport_dialer.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_transport_mjs: core/net/transport.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_event_log_mjs: core/obs/event_log.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_event_log_v2_mjs: core/obs/event_log_v2.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_reality_gap_monitor_mjs: core/obs/reality_gap_monitor.mjs — 2 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_perf_engine_mjs: core/performance/perf_engine.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_repo_state_mjs: core/persist/repo_state.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_multi_strategy_mjs: core/portfolio/multi_strategy.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_reconcile_v1_mjs: core/recon/reconcile_v1.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_self_healing_mjs: core/resilience/self_healing.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_risk_governor_mjs: core/risk/risk_governor.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_engine_paper_mjs: core/sim/engine_paper.mjs — 2 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_clock_mjs: core/sys/clock.mjs — 2 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_chaos_engineer_mjs: core/testing/chaos_engineer.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] core_allowlisted_truth_engine_mjs: core/truth/truth_engine.mjs — 1 TIME violation(s) (allowlisted)
- [PASS] total_violations_zero: 0 forbidden API usages across CERT-backbone + core/
- [PASS] core_scan_complete: core/ scanned: 168 files, 44 allowlisted, 0 un-allowlisted violations

## FAILED
- NONE
