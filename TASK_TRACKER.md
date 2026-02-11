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
- [ ] `core/exec/safety_integrated_executor.mjs`
- [x] `core/exec/safety_gate_validator.mjs`
- [ ] `core/risk/risk_governor_wrapper.mjs`
- [ ] `truth/live_config.schema.json`
- [x] `scripts/verify/safety_gates_check.mjs`

### EPOCH-18: Strategy layer
- [ ] `core/strategy/strategy_orchestrator.mjs`
- [ ] `core/exec/signal_converter.mjs`
- [ ] `core/portfolio/portfolio_allocator.mjs`
- [ ] `core/exec/strategy_aware_executor.mjs`
- [ ] `scripts/verify/strategy_check.mjs`

### EPOCH-19: Governance
- [ ] `core/governance/governance_engine.mjs`
- [ ] `core/governance/rules_engine.mjs`
- [ ] `core/governance/approval_workflow.mjs`
- [ ] `core/exec/mode_aware_executor.mjs`
- [ ] `scripts/verify/governance_check.mjs`

## Notes
- Network-dependent checks must be OFF by default and enabled only via explicit env flags.
- No live orders by default.
