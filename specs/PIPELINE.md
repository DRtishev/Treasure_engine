# Pipeline (PLAN → BUILD → TEST → EVIDENCE → RELEASE)

## 1) PLAN
- Write assumptions ledger and risk register.
- Confirm SSOT inputs and resolve conflicts in `specs/SPEC_CONFLICTS.md`.
- Produce minimal patch plan with rollback path.

## 2) BUILD
- Implement minimal diff.
- Preserve offline-first behavior and dry-run defaults.
- Keep run-scoped output discipline (`TREASURE_RUN_DIR`).

## 3) TEST
- Mandatory anti-flake baseline:
  - `npm run verify:paper` (x2)
  - `npm run verify:e2` (x2)
- Determinism stress:
  - `npm run verify:e2:multi`
- Stability/supporting checks:
  - `npm run verify:phase2`
  - `npm run verify:integration`
  - `npm run verify:core`

## 4) EVIDENCE (mandatory structure)
Each epoch folder must follow:
`reports/evidence/EPOCH-XX/`
- `PREFLIGHT.log`
- `GATE_PLAN.md`
- `gates/*.log`
- `DIFF.patch`
- `SHA256SUMS.SOURCE.txt`
- `SHA256SUMS.EXPORT.txt`
- `SUMMARY.md`

Recommended additions: `INSTALL.log`, `SNAPSHOT.md`, `ASSUMPTIONS.md`, `RISK_REGISTER.md`, `TREE_L2.txt`.

## 5) RELEASE
- Build `FINAL_VALIDATED.zip`.
- Exclude:
  - `.git/`
  - `node_modules/`
  - global logs/caches/temp folders
- Include source, specs/docs, truth schemas, verify scripts, and evidence.
- Publish `FINAL_VALIDATED.zip.sha256`.

## CI Recommendations
- Required gate in CI: `npm run verify:core`.
- Upload `reports/evidence/<EPOCH-ID>/` and export checksums as CI artifacts.
