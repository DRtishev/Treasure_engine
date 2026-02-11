# EPOCH-21 — Deployment & Release Governor

## 1) Reality Snapshot (current repo)
- Release artifacts/checksums are already part of workflow (`FINAL_VALIDATED.zip`, `.sha256`, evidence packs).
- Runbook and deployment docs exist: `RUNBOOK.md`, `docs/DEPLOYMENT_GUIDE.md`.
- Verification aggregate already exists: `npm run verify:core`.

## 2) Goal / Non-goals
### Goal
Formalize release governor rules to declare SAFE/BLOCKED with reproducible evidence and artifact integrity checks.

### Non-goals
- No infrastructure-specific deployment scripts.
- No automatic production rollout.

## 3) Constraints
- Release verdict requires evidence completeness and checksum validity.
- No live trading enablement by default.
- Must preserve existing gate contract and run-dir discipline.

## 4) Design (interfaces, contracts, events)
- Define release checklist contract:
  - required gate set and anti-flake repeats
  - evidence folder completeness
  - export checksum verification
  - risk sign-off section
- Introduce verdict artifact format under `reports/evidence/EPOCH-XX/VERDICT.md`.

## 5) Patch Plan
### New files
- `scripts/verify/release_governor_check.mjs`
- `specs/epochs/RELEASE_CHECKLIST_TEMPLATE.md`

### Modified files
- `package.json` (`verify:release-governor`, `verify:epoch21`)
- `RUNBOOK.md` / `docs/DEPLOYMENT_GUIDE.md` (release gating updates)

## 6) New/updated verify gates
- `npm run verify:release-governor`
- assertions:
  - required logs/manifests exist
  - export checksums match
  - SAFE/BLOCKED declared with explicit rationale

## 7) Evidence requirements
`reports/evidence/EPOCH-21/`:
- complete gate logs
- release governor log
- checksums for source/evidence/export
- final verdict document

## 8) Stop rules
PASS only if release governor check passes and all required gates pass twice where mandated.
FAIL if any artifact integrity/evidence completeness check fails.

## 9) Risk register
1. Human-readable summary without machine-checkable proof → add structured governor check.
2. Export includes transient artifacts → enforce strict excludes and inventory.
3. Missing anti-flake reruns at release time → release-governor must assert rerun logs.
4. SHA manifests stale after late edits → require final manifest validation step.
5. Ambiguous SAFE/BLOCKED criteria → standardized verdict template.

## 10) Rollback plan
Block release, revert release-governor integration changes, and restore previous release workflow until checks are fixed.
