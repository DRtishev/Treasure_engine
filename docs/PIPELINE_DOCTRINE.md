# PIPELINE DOCTRINE

## Run-dir discipline
All variable run artifacts must be written under:

`reports/runs/<gate>/<seed>/<repeat>/<run_id>/`

Required context:
- `TREASURE_RUN_DIR`
- `TREASURE_RUN_ID`
- `SEED` (default `12345`)

## Wrapper contracts
- `scripts/verify/run_with_context.mjs` is the canonical wrapper for run-scoped gates.
- Paper gate must use wrapper context (`verify:paper` -> `verify:paper:raw`).
- E2 gate must use wrapper context (`verify:e2` -> `verify:e2:raw`).
- Multi-seed stability is enforced by `verify:e2:multi`.

## Anti-flake doctrine
- Critical gates execute twice before SAFE verdict:
  - `verify:paper`
  - `verify:e2`
  - `verify:monitoring`
  - `verify:release-governor`
- Same-seed repeats are used to detect hidden drift.

## Multi-seed doctrine
- Use `verify:e2:multi` to validate structural determinism across seeds.
- Fail if repeated same-seed result diverges unexpectedly.

## Export exclusion doctrine
Canonical validated export must exclude:
- `.git/`
- `node_modules/`
- `reports/runs/`
- transient logs (`logs/`), caches and temp dirs (`.cache/`, `tmp/`, `temp/`)
- incoming archives and generated bundles not required for source handoff

## SAFE/BLOCKED protocol
### SAFE template
- Status: SAFE
- Evidence path(s): `reports/evidence/<EPOCH-ID>/...`
- Gates: command list + pass logs
- Integrity: manifest check results + artifact SHA
- Remaining risks: explicit and bounded

### BLOCKED template
- Status: BLOCKED
- Blocker(s): exact failing gate/check
- Repro: command + log path
- Mitigation plan: concrete next patch and rerun list

## Network discipline
- Network-dependent tests are skipped by default.
- Enable only with `ENABLE_NETWORK_TESTS=1`.
- Offline verify wall must stay green without network.
