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

## ZIP policy
- `FINAL_VALIDATED.zip` is `NOT_REQUIRED` for PASS in this epoch.
