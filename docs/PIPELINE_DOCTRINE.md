# Pipeline Doctrine (Truth Layer)

## 1) Run-dir discipline standard
All gate outputs that can vary per run must be written under:

`reports/runs/<gate>/<seed>/<repeat>/<run_id>/`

Rules:
- `<seed>` defaults to `12345` unless explicitly overridden.
- `<repeat>` differentiates anti-flake reruns (`default`, `default_2`, etc.).
- Canonical artifacts must not be overwritten in-place by repeated runs.

## 2) Two-run anti-flake policy
Mandatory for release-quality epochs:
- `npm run verify:e2` twice
- `npm run verify:paper` twice

Policy:
- PASS only if both runs pass.
- Any mismatch in structural outputs must be investigated before SAFE verdict.

## 3) Multi-seed stability policy
Mandatory deterministic stress gate:
- `npm run verify:e2:multi`

Minimum behavior:
- Run at least 3 seeds.
- Include repeated same-seed check.
- Fail on unexpected structural drift.

## 4) Export exclusion policy
`FINAL_VALIDATED*.zip` must exclude:
- `.git/`
- `node_modules/`
- transient logs/caches/temp (`logs/`, `.cache/`, `tmp/`, `temp/`)
- large transient archives not part of required deliverables

## 5) Evidence pack structure standard
Per epoch: `reports/evidence/<EPOCH-ID>/`

Required minimum:
- `PREFLIGHT.log`
- `INVENTORY.txt`
- `GATE_PLAN.md`
- `gates/*.log`
- `DIFF.patch`
- `SHA256SUMS.SOURCE.txt`
- `SHA256SUMS.EVIDENCE.txt`
- `SUMMARY.md`
- `VERDICT.md` (for closeout)

Recommended:
- `RISK_REGISTER.md`, `ASSUMPTIONS_LEDGER.md`, `IMPACT_ANALYSIS.md`, `PIPELINE_IMPROVEMENT_REPORT.md`.

## 6) SAFE/BLOCKED declaration protocol
### SAFE
Declare SAFE only when:
1. required gates pass (including anti-flake and multi-seed where applicable)
2. checksum manifests validate
3. export checksum exists and matches
4. evidence pack is complete
5. remaining risks are explicitly documented and accepted

### BLOCKED
Declare BLOCKED when any critical gate/checksum/evidence criterion fails.
BLOCKED declaration must include:
- explicit blockers
- affected files/paths
- reproducible command/log references
