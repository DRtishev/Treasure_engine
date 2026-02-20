# EDGE_LAB COURT_MANIFEST

Canonical evidence contract for `reports/evidence/EDGE_LAB/`.

## Required court outputs
- `SOURCES_AUDIT.md`
- `REGISTRY_COURT.md`
- `DATASET_COURT.md`
- `EXECUTION_COURT.md`
- `EXECUTION_SENSITIVITY_GRID.md`
- `RISK_COURT.md`
- `OVERFIT_COURT.md`
- `REDTEAM_COURT.md`
- `SRE_COURT.md`
- `VERDICT.md`

## Required supporting evidence outputs
- `SNAPSHOT.md`
- `MCL_NOTES.md`
- `EVIDENCE_INDEX.md`
- `MEGA_CLOSEOUT_EDGE_LAB.md`
- `MANIFEST_CHECK_RESULT.md`
- `ANTI_FLAKE_X2.md`
- `PAPER_COURT.md`
- `EXECUTION_DRIFT.md`
- `SLI_BASELINE.md`
- `META_AUDIT.md`
- `MEGA_CLOSEOUT_NEXT_EPOCH.md`

## Required machine outputs
- `gates/manual/contract_manifest_result.json`
- `gates/manual/verdict_stratification.json`
- `gates/manual/determinism_x2.json`
- `gates/manual/proxy_guard.json`
- `gates/manual/paper_court.json`
- `gates/manual/sli_baseline.json`
- `gates/manual/meta_audit.json`
- `gates/manual/final_verdict.json`

## Drift policy
- Missing required files => `CONTRACT_DRIFT`.
- Unexpected extra files at root scope => `EXTRA_EVIDENCE`.
- PASS is legal only when manifest check, determinism x2, paper court, SLI baseline, proxy guard, and meta-audit all report PASS.
