# TASK_TRACKER

## Active program: EPOCH-17 → EPOCH-21
Source of truth: `SDD_EPOCH_17_21.md`.

## Current baseline status (latest EPOCH-BOOT cycle)
- [x] Deterministic run artifacts (`reports/runs/<run_id>/`)
- [x] Anti-flake gates (`verify:e2` x2, `verify:paper` x2)
- [x] Split manifests (`SHA256SUMS.SOURCE.txt`, `SHA256SUMS.EVIDENCE.txt`)
- [x] Release artifacts (`FINAL_VALIDATED.zip`, `EVIDENCE_PACK_EPOCH-BOOT.tar.gz`)

## Next implementation track (from SDD)
### EPOCH-17: Live execution + safety integration
- [x] `core/exec/safety_integrated_executor.mjs`
- [x] `core/exec/safety_gate_validator.mjs`
- [x] `core/risk/risk_governor_wrapper.mjs`
- [x] `truth/live_config.schema.json`
- [x] `scripts/verify/safety_gates_check.mjs`
- [x] `scripts/verify/safety_integrated_executor_check.mjs`

### EPOCH-18: Strategy layer
- [x] `core/strategy/strategy_orchestrator.mjs`
- [x] `core/exec/signal_converter.mjs`
- [x] `core/portfolio/portfolio_allocator.mjs`
- [x] `core/exec/strategy_aware_executor.mjs`
- [x] `scripts/verify/strategy_check.mjs`

### EPOCH-19: Governance
- [x] `core/governance/governance_engine.mjs`
- [x] `core/governance/rules_engine.mjs`
- [x] `core/governance/approval_workflow.mjs`
- [x] `core/exec/mode_aware_executor.mjs`
- [x] `scripts/verify/governance_check.mjs`

## Notes
- Network-dependent checks must be OFF by default and enabled only via explicit env flags.
- No live orders by default.


### EPOCH-20: Monitoring + Performance
- [x] `truth/monitoring_report.schema.json`
- [x] `scripts/verify/monitoring_perf_check.mjs`
- [x] `package.json` scripts `verify:monitoring`, `verify:epoch20`

### EPOCH-21: Deployment + Release Governor
- [x] `scripts/verify/release_governor_check.mjs`
- [x] `specs/epochs/RELEASE_CHECKLIST_TEMPLATE.md`
- [x] `package.json` scripts `verify:release-governor`, `verify:epoch21`
