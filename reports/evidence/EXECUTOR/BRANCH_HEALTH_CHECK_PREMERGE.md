# BRANCH_HEALTH_CHECK_PREMERGE

STATUS: BLOCKED
REASON_CODE: BH01_MISSING_BASELINE_REF
RUN_CONTEXT_TZ: Europe/Amsterdam
LANG: ru

## SNAPSHOT
- `git status -sb` => `## work`
- `git rev-parse --abbrev-ref HEAD` => `work`
- `git rev-parse HEAD` => `0cbab385bcef67feb4ddd8bdeaca7ffeaa615751`
- `node -v` => `v20.19.6`
- `npm -v` => `11.4.2` (warn: unknown env config `http-proxy`)
- `git log --oneline --decorate -n 20` => latest: `0cbab38 Pin Node runtime, vendor Node toolchain, add liquidations SSOT & network unlock, and update evidence artifacts`

## DIFF_SCOPE
### authoritative attempt (requested by protocol)
- `git diff --name-status origin/main...HEAD` => **EC=128** (`origin/main` missing)
- `git diff --stat origin/main...HEAD` => **EC=128** (`origin/main` missing)
- `git diff --name-only origin/main...HEAD | wc -l` => **EC=128** (`origin/main` missing)

### fallback (non-authoritative): `HEAD^..HEAD`
- changed files total: `413`
- evidence files changed (`reports/evidence/**`): `344`

Buckets (fallback классификация):
- A) Code/logic: `.gitignore`, `package.json`, `NODE_TRUTH.md`, `DATA_AUTHORITY_MODEL.md`, `EDGE_LAB/LIQUIDATIONS_INTELLIGENCE_ROUTE.md`, executors/edge verify logic.
- B) Regressions/tests: extensive additions under `scripts/verify/**`, `scripts/ops/**`.
- C) Evidence/receipts: massive refresh under `reports/evidence/**`.
- D) Artifacts/toolchains: `artifacts/incoming/NETKILL_LEDGER.sha256` (+ vendored toolchain paths from commit scope).

## EVIDENCE_BLOAT_CHECK (fallback)
- Evidence changed count (`HEAD^..HEAD`): `344`
- Top evidence paths captured by sort/head (50) include EDGE_LAB P0, EDGE_PROFIT_00 registry/sandbox/stub, EXECUTOR gate outputs.

## CRITICAL_GATES_QUICK_CHECK
Commands and EC:
- `npm run -s verify:regression:node-truth-alignment` => EC=0 PASS
- `npm run -s verify:regression:node-wrap-contract` => EC=0 PASS
- `npm run -s verify:regression:node-backend-receipt-contract` => EC=0 PASS
- `npm run -s verify:regression:node-vendored-backend-must-win` => EC=0 PASS
- `npm run -s verify:regression:node-nvm-ban` => EC=0 PASS
- `npm run -s verify:regression:churn-contract01` => EC=0 PASS
- `npm run -s verify:regression:ec01-reason-context-contract` => EC=0 PASS

## SAFE_CLEANUP_DRYRUN
- `.gitignore` already contains ignore rules for `reports/evidence/EPOCH-*`.
- Tracked EPOCH files currently present in index: `2999`.
- DRY RUN removal target list generated from:
  - `git ls-files 'reports/evidence/EPOCH-*' > /tmp/epoch_tracked_files.txt`
- First entries (for operator preview):
  - `reports/evidence/EPOCH-01/DIFF.patch`
  - `reports/evidence/EPOCH-01/GATE_PLAN.md`
  - `reports/evidence/EPOCH-01/INVENTORY.txt`
  - `reports/evidence/EPOCH-01/PREFLIGHT.md`
  - `reports/evidence/EPOCH-01/SHA256SUMS.txt`

## CLEANUP_DECISION
- Cleanup required: **YES** (index contains thousands of transient EPOCH files despite ignore policy).
- Not executed in this run due non-authoritative diff baseline (`origin/main` missing). Fail-closed.

## OPERATOR_NOTE (commit hygiene)
- Local history is noisy and long-lived; recommend GitHub UI **Squash merge** to keep main history minimal.

## FINAL
- GATE_MATRIX: quick critical set PASS; baseline diff authority BLOCKED.
- PR_SIZE (fallback): total=413, evidence=344.
- FINAL_VERDICT: **BLOCKED**.
- ONE_NEXT_ACTION: `git fetch origin main`
