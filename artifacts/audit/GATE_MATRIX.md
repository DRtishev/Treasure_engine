# GATE_MATRIX.md — Матрица гейтов x2 anti-flake

## Прогон x2

| # | Гейт | Run 1 EC | Run 2 EC | Совпадение | ND detected | Вердикт |
|---|---|---|---|---|---|---|
| 1 | verify:fast (38 sub-gates) | 0 | 0 | ДА | НЕТ | **PASS** |
| 2 | e108_backtest_determinism_x2 (10 sub-tests) | 0 | 0 | ДА | НЕТ | **PASS** |
| 3 | ops:life (T1-T5) | 0 | — | — | — | **PASS** |
| 4 | ops:doctor (v3) | 0 | — | — | — | **PASS** |
| 5 | ops:cockpit | 0 | — | — | — | **PASS** |

## Sub-gates verify:fast (оба прогона идентичны)

| Gate | Status |
|---|---|
| node_toolchain_ensure | PASS |
| regression_toolchain_reason01_classification | PASS |
| regression_toolchain_reason02_detail_required | PASS |
| regression_unlock01_no_incoming_unlock_files | PASS |
| RG_ND_BYTE02 repo manifest stable x2 | PASS |
| regression_node_truth_alignment | PASS |
| regression_node_wrap_contract | PASS |
| regression_node_vendor01 | PASS |
| regression_node_nvm01 | PASS |
| regression_churn_contract01 | PASS |
| regression_ec01_reason_context_contract | PASS |
| regression_netkill_ledger_enforcement | PASS |
| regression_pr01_evidence_bloat_guard | PASS |
| regression_pr05_executor_ssot_stable_set | PASS |
| regression_pr07_executor_runid_immutable | PASS |
| regression_pr08_executor_stable_only | PASS |
| regression_victory_fast_no_heavy | PASS |
| regression_rg_reason01_token_purity | PASS |
| regression_rg_reason02_in_taxonomy | PASS |
| regression_epoch_skip01_respects_tracked_state | PASS |
| regression_rg_rdy_select01_forces_run_id | PASS |
| regression_rg_rdy_select02_selector_absent_in_daily | PASS |
| regression_rg_lane05_static_readiness | PASS |
| regression_rg_cap_mean01_keys_have_meaning | PASS |
| regression_rg_deliv01_delivery_doc_present | PASS |
| regression_rg_deliv02_delivery_doc_coherence | PASS |
| regression_rg_trust01_trust_doc_present | PASS |
| regression_rg_trust02_cockpit_truthlevel_column | PASS |
| regression_rg_net_unlock01_file_contract | PASS |
| regression_rg_net_unlock02_no_allow_file_after_lock | PASS |
| regression_rg_net_unlock03_cert_refuses_with_allow_file | PASS |
| regression_rg_life04_next_action_surfacing | PASS |
| regression_fsm01_no_skip_states | PASS |
| regression_fsm02_consciousness | PASS |
| regression_immune01_integration | PASS |
| regression_metaagent01_fleet | PASS |
| regression_san01_global_forbidden_apis | PASS |
| regression_backtest01_organ_health | PASS |

## Вердикт

**DETERMINISM CONFIRMED**: Оба прогона verify:fast x2 и e108 x2 дали идентичные результаты. Нондетерминизм НЕ обнаружен в gate chain.
