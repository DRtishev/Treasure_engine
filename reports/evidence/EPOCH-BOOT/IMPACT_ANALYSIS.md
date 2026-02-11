# IMPACT_ANALYSIS — EPOCH-BOOT

## Modules touched
- Evidence pack assets under `reports/evidence/EPOCH-BOOT/`.
- Root operational docs (`README.md`) and ignore policy (`.gitignore`).

## Protected modules / gates
- Simulation + truth path: `verify:e2`, `verify:e2:multi`.
- Paper path: `verify:paper`.
- Phase safety path: `verify:phase2`.
- Integration path: `verify:integration`.

## Regression risks
- Low code regression risk (no core engine logic changed).
- Medium process risk if ignore rules accidentally hide required evidence.

## Determinism risks
- Repeated runs can overwrite canonical artifacts unless scoped by run context.
- Logs may contain nondeterministic fields (timestamps, run ids), so checksums must split SOURCE vs EVIDENCE.

## Mitigation
- Keep run artifacts in `reports/runs/<gate>/<seed>/<repeat>/<run_id>/`.
- Maintain split checksums for source files vs evidence files.
