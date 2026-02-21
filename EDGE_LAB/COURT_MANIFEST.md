# EDGE_LAB COURT_MANIFEST

Canonical evidence contract for `reports/evidence/EDGE_LAB/`.

## Required court outputs
- `SOURCES_AUDIT.md`
- `REGISTRY_COURT.md`
- `PROFIT_CANDIDATES_COURT.md`
- `DATASET_COURT.md`
- `EXECUTION_COURT.md`
- `EXECUTION_SENSITIVITY_GRID.md`
- `EXECUTION_REALITY_COURT.md`
- `EXECUTION_BREAKPOINTS.md`
- `RISK_COURT.md`
- `OVERFIT_COURT.md`
- `REDTEAM_COURT.md`
- `SRE_COURT.md`
- `MICRO_LIVE_READINESS.md`
- `VERDICT.md`

## Required supporting evidence outputs
- `SNAPSHOT.md`
- `MCL_NOTES.md`
- `EVIDENCE_INDEX.md`
- `MEGA_CLOSEOUT_EDGE_LAB.md`
- `GOVERNANCE_FINGERPRINT.md`
- `MANIFEST_CHECK_RESULT.md`
- `RAW_STABILITY_REPORT.md`
- `ANTI_FLAKE_X2.md`
- `ANTI_FLAKE_INDEPENDENCE.md`
- `LEDGER_ACYCLICITY.md`
- `NONDETERMINISM_REPORT.md`
- `PAPER_COURT.md`
- `PAPER_EVIDENCE.md`
- `EXECUTION_DRIFT.md`
- `SLI_BASELINE.md`
- `META_AUDIT.md`
- `SHA256SUMS.md`
- `SHA256CHECK.md`
- `MEGA_CLOSEOUT_NEXT_EPOCH.md`

## Required machine outputs
- `gates/manual/contract_manifest_result.json`
- `gates/manual/verdict_stratification.json`
- `gates/manual/raw_stability.json`
- `gates/manual/determinism_x2.json`
- `gates/manual/anti_flake_independence.json`
- `gates/manual/ledger_acyclicity.json`
- `gates/manual/proxy_guard.json`
- `gates/manual/paper_court.json`
- `gates/manual/paper_evidence.json`
- `gates/manual/sli_baseline.json`
- `gates/manual/meta_audit.json`
- `gates/manual/ledger_check.json`
- `gates/manual/final_verdict.json`
- `gates/manual/profit_candidates_court.json`
- `gates/manual/execution_reality_court.json`
- `gates/manual/micro_live_readiness.json`

## Drift policy
- Missing required files => `CONTRACT_DRIFT`.
- Unexpected extra files at root scope => `EXTRA_EVIDENCE`.
- PASS is legal only when manifest check, raw stability, determinism x2, proxy guard, paper court, SLI baseline, meta-audit, and ledger check report PASS.
- Promotion gates (PROFIT_CANDIDATES_COURT, EXECUTION_REALITY_COURT, MICRO_LIVE_READINESS, PAPER_EVIDENCE) must be PASS or NEEDS_DATA. FAIL in any gate => overall BLOCKED.
- ANTI_FLAKE_INDEPENDENCE.md must be PASS (anti-flake contract for edge:all producer pipeline).
- LEDGER_ACYCLICITY.md must be PASS (confirms SHA256SUMS.md and SHA256CHECK.md are excluded from ledger scope).

## Calm P0 + Infra P0 Artifacts (CALM_INFRA_P0_HARDENING_V1)

### Calm P0 Evidence (reports/evidence/EDGE_LAB/P0/)
- `P0/CANON_SELFTEST.md`
- `P0/CHECKSUMS.md` (includes SCOPE_MANIFEST_SHA; sha256_raw+sha256_norm; norm_rules_sha)
- `P0/RECEIPTS_CHAIN.md`
- `P0/DATA_COURT.md`
- `P0/CALM_MODE_P0_CLOSEOUT.md`

### Calm P0 Machine Outputs (reports/evidence/EDGE_LAB/gates/manual/)
- `gates/manual/canon_selftest.json`
- `gates/manual/calm_p0_final.json`

### Infra P0 Evidence (reports/evidence/INFRA_P0/)
- `INFRA_P0/DEPS_OFFLINE_INSTALL.md`
- `INFRA_P0/NODE_TRUTH_GATE.md`
- `INFRA_P0/VERIFY_MODE_GATE.md`
- `INFRA_P0/GOLDENS_APPLY_GATE.md`
- `INFRA_P0/FORMAT_POLICY_GATE.md`
- `INFRA_P0/INFRA_P0_CLOSEOUT.md`

### Infra P0 Machine Outputs (reports/evidence/INFRA_P0/gates/manual/)
- `INFRA_P0/gates/manual/node_truth_gate.json`
- `INFRA_P0/gates/manual/verify_mode_gate.json`
- `INFRA_P0/gates/manual/deps_offline_install.json`
- `INFRA_P0/gates/manual/goldens_apply_gate.json`
- `INFRA_P0/gates/manual/format_policy_gate.json`
- `INFRA_P0/gates/manual/infra_p0_final.json`

### SSOT Files (repository root)
- `NODE_TRUTH.md`
- `VERIFY_MODE.md`
- `BUNDLE_CONTRACT.md`
- `GOLDENS_APPLY_PROTOCOL.md`
- `FORMAT_POLICY.md`

### SSOT Files (EDGE_LAB/)
- `EDGE_LAB/EVIDENCE_CANON_RULES.md`
- `EDGE_LAB/UPDATE_SCOPE_POLICY.md`
- `EDGE_LAB/DATA_CONFIRM_POLICY.md`
- `EDGE_LAB/DELTA_CALC_SPEC.md`
- `EDGE_LAB/tests/CANON_TEST_VECTORS.md`

### Calm P0 PASS Criteria
- CANON_SELFTEST: PASS (all 7 vectors including D005 catch)
- CHECKSUMS: PASS (SCOPE_MANIFEST_SHA present, all files hashed)
- RECEIPTS_CHAIN: PASS (chain anchored on sha256_norm)
- DATA_COURT: PASS or NEEDS_DATA (non-blocking)

### Infra P0 PASS Criteria
- NODE_TRUTH_GATE: PASS (Node family matches NODE_TRUTH.md)
- VERIFY_MODE_GATE: PASS (VERIFY_MODE valid, VM04 format check clean)
- DEPS_OFFLINE: PASS or BLOCKED DEP01 (honest capsule requirement)
- GOLDENS_APPLY: PASS (protocol file present)
- FORMAT_POLICY: PASS (no FP01 violations)

## ZIP policy
- `FINAL_VALIDATED.zip` is `NOT_REQUIRED` for PASS in this epoch.
