# R3 — Speed/Ergonomics Spec

> Phase: R3 | Priority: P2 | Duration: 3–5 days | Status: PLANNED

---

## 1. Objective

Don't die from verify. Fast tiers for operator speed + script index for discoverability.

## 2. Requirements

| ID | Requirement | Current State | Target |
|----|------------|--------------|--------|
| REQ-R3.1 | Fast tiers: instant vs full | Single verify:fast (~70+ gates, ~30s) | verify:fast:instant (10-15 gates, <5s) + verify:fast (full) |
| REQ-R3.2 | Script index generator | No index; 998+ scripts, manual discovery | Auto-generated index with metadata + search |

## 3. Mechanism Design

### 3.1 Fast Tiers (REQ-R3.1)

**Concept**: Split verify:fast into two tiers:

**verify:fast:instant** (~10-15 critical gates, <5s):
- toolchain-reason01-classification
- toolchain-reason02-detail-required
- unlock01-no-incoming-unlock-files
- repo:byte-audit:x2
- node-truth-alignment
- churn-contract01
- pr01-evidence-bloat-guard
- nd-core-san01
- fsm01-no-skip-states
- kill-switch01-triggers

**verify:fast** (full, all existing gates — unchanged).

**Budget enforcement**: verify:fast:instant MUST NOT exceed 15 gates. Gate count checked by RG_FAST_TIERS_FAST01.

### 3.2 Script Index Generator (REQ-R3.2)

**New file**: `scripts/ops/script_index.mjs`

**Mechanism**:
1. Scan `scripts/verify/` and `scripts/ops/` for all `.mjs`/`.sh` files
2. Extract metadata: filename, first JSDoc comment or `// Purpose:` line, npm script name (from package.json)
3. Generate `artifacts/script_index.json` with:
   ```json
   {
     "generated": "<timestamp>",
     "total_scripts": 1033,
     "categories": {
       "verify": [...],
       "ops": [...],
       "regression": [...]
     },
     "scripts": [
       { "file": "scripts/verify/e100_run.mjs", "npm": "verify:e100", "purpose": "E100 epoch verification", "category": "verify" }
     ]
   }
   ```
4. npm script: `ops:script-index` to regenerate

**Freshness**: RG_SCRIPT_INDEX_FAST01 checks that index exists and file count matches reality.

## 4. Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|-----------|
| Instant tier misses critical gate | False safety | Conservative gate selection; full fast still runs in CI |
| Script index stale | Misleading search | Freshness gate in verify:fast |
| Index generation slow | Defeats purpose | Single-pass scan, no network, <2s |

## 5. New Gates

### Fast
**RG_FAST_TIERS_FAST01**: verify:fast:instant gate count <= 15 AND verify:fast:instant is subset of verify:fast.

**RG_SCRIPT_INDEX_FAST01**: `artifacts/script_index.json` exists AND total_scripts count matches actual file count (±5 tolerance for WIP).

### Deep
None required (pure tooling).

## 6. Evidence Paths

- `reports/evidence/EPOCH-RADLITE-R3/fast_tiers_proof.md`
- `reports/evidence/EPOCH-RADLITE-R3/script_index_proof.md`

## 7. Definition of Done

- [ ] verify:fast:instant runs in <5s with critical gates
- [ ] Script index generated and accurate
- [ ] verify:fast x2 PASS (including 2 new gates)
- [ ] verify:deep PASS
- [ ] victory:seal PASS
- [ ] AUDIT_AFTER_R3.md filled with honest verdict
