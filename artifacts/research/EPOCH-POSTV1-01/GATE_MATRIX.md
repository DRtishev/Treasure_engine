# GATE MATRIX — EPOCH-POSTV1-01

## verify:fast (50 гейтов)

| # | Гейт | Статус | Reason |
|---|-------|--------|--------|
| 1 | node_toolchain_ensure | PASS | NONE |
| 2 | regression_toolchain_reason01_classification | PASS | NONE |
| 3 | regression_toolchain_reason02_detail_required | PASS | NONE |
| 4 | regression_unlock01_no_incoming_unlock_files | PASS | NONE |
| 5 | RG_ND_BYTE02 repo manifest stable x2 | PASS | NONE |
| 6 | regression_node_truth_alignment | PASS | NONE |
| 7 | regression_node_wrap_contract | PASS | NONE |
| 8 | regression_node_vendor01 | PASS | NONE |
| 9 | regression_node_nvm01 | PASS | NONE |
| 10 | regression_churn_contract01 | PASS | NONE |
| 11 | regression_ec01_reason_context_contract | PASS | NONE |
| 12 | regression_netkill_ledger_enforcement | PASS | NONE |
| 13 | regression_pr01_evidence_bloat_guard | PASS | NONE |
| 14 | regression_pr05_executor_ssot_stable_set | PASS | NONE |
| 15 | regression_pr07_executor_runid_immutable | PASS | NONE |
| 16 | regression_pr08_executor_stable_only | PASS | NONE |
| 17 | regression_victory_fast_no_heavy | PASS | NONE |
| 18 | regression_rg_reason01_token_purity | PASS | NONE |
| 19 | regression_rg_reason02_in_taxonomy | PASS | NONE |
| 20 | regression_epoch_skip01_respects_tracked_state | PASS | NONE |
| 21 | regression_rg_rdy_select01_forces_run_id | PASS | NONE |
| 22 | regression_rg_rdy_select02_selector_absent_in_daily | PASS | NONE |
| 23 | regression_rg_lane05_static_readiness | PASS | NONE |
| 24 | regression_rg_cap_mean01_keys_have_meaning | PASS | NONE |
| 25 | regression_rg_deliv01_delivery_doc_present | PASS | NONE |
| 26 | regression_rg_deliv02_delivery_doc_coherence | PASS | NONE |
| 27 | regression_rg_trust01_trust_doc_present | PASS | NONE |
| 28 | regression_rg_trust02_cockpit_truthlevel_column | PASS | NONE |
| 29 | regression_rg_net_unlock01_file_contract | PASS | NONE |
| 30 | regression_rg_net_unlock02_no_allow_file_after_lock | PASS | NONE |
| 31 | regression_rg_net_unlock03_cert_refuses_with_allow_file | PASS | NONE |
| 32 | regression_rg_life04_next_action_surfacing | PASS | NONE |
| 33 | regression_fsm01_no_skip_states | PASS | NONE |
| 34 | regression_fsm02_consciousness | PASS | NONE |
| 35 | regression_immune01_integration | PASS | NONE |
| 36 | regression_metaagent01_fleet | PASS | NONE |
| 37 | regression_san01_global_forbidden_apis | PASS | NONE |
| 38 | regression_backtest01_organ_health | PASS | NONE |
| 39 | regression_court_wiring01_sweep_uses_pipeline | PASS | NONE |
| 40 | regression_court_wiring02_guard_rejects_empty | PASS | NONE |
| 41 | regression_sharpe_ssot01_no_inline | PASS | NONE |
| 42 | regression_metric_parity01_overfit_uses_unified | PASS | NONE |
| 43 | regression_metric_parity02_canary_real_dd | PASS | NONE |
| 44 | regression_metric_parity03_required_keys | PASS | NONE |
| 45 | regression_fsm_deadlock01_detection | PASS | NONE |
| 46 | regression_doctor_score01_confidence | PASS | NONE |
| 47 | regression_cockpit_dynamic_next01 | PASS | NONE |
| 48 | regression_kill_switch01_triggers | PASS | NONE |
| 49 | regression_reconcile01_detects_drift | PASS | NONE |
| 50 | regression_flatten01_closes_all | PASS | NONE |

## e108 Determinism

| # | Контракт | Run 1 | Run 2 |
|---|----------|-------|-------|
| 1-10 | backtest_determinism_x2 | 10/10 PASS | 10/10 PASS |

## ops

| Команда | EC | Статус | Детали |
|---------|----|--------|--------|
| ops:cockpit | 0 | PASS | FSM: BOOT, mode: LIFE, readiness: NEEDS_DATA |
| ops:doctor | 0 | IN_PROGRESS | Startup: BOOT_OK, Liveness: проходит |

## Итого

- **verify:fast x2**: 50/50 PASS, 0 расхождений ✓
- **e108 x2**: 10/10 PASS, 0 расхождений ✓
- **ops:cockpit**: PASS ✓
- **Детерминизм**: ПОДТВЕРЖДЁН
