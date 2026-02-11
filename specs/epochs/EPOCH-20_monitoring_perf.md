# EPOCH-20 — Monitoring & Performance

## 1) Reality Snapshot (current repo)
- Monitoring foundations exist: `core/monitoring/safety_monitor.mjs`, `core/obs/reality_gap_monitor.mjs`.
- Performance engine exists: `core/performance/perf_engine.mjs`.
- Integration reports are already generated: `reports/integration_report.json` via `scripts/verify/master_integration_e2e.mjs`.

## 2) Goal / Non-goals
### Goal
Standardize performance and observability contracts so safety/perf regressions are detected deterministically.

### Non-goals
- No external telemetry backend integration.
- No cloud-only dashboards in verify path.

## 3) Constraints
- Offline-first verification only.
- Deterministic latency/perf assertions under frozen clock contexts where applicable.
- Backward compatibility with event schema and existing verify outputs.

## 4) Design (interfaces, contracts, events)
- Define canonical monitoring report contract (latency breakdown, reject ratio, fill ratio, risk incidents).
- Add schema checks for monitoring output (new schema file if needed under `truth/`).
- Require explicit separation: canonical report vs run-local debug log.

## 5) Patch Plan
### New files
- `truth/monitoring_report.schema.json`
- `scripts/verify/monitoring_perf_check.mjs`

### Modified files
- `core/monitoring/safety_monitor.mjs`
- `core/performance/perf_engine.mjs`
- `package.json` (`verify:monitoring`, `verify:epoch20`)

### BLOCKER note
If current modules do not expose stable report serialization hooks, minimal prerequisite patch is to add `toReport()` methods without changing runtime semantics.

## 6) New/updated verify gates
- `npm run verify:monitoring`
- assertions: schema-valid report, deterministic values under same seed/context, no NaN/inf metrics.

## 7) Evidence requirements
`reports/evidence/EPOCH-20/` with monitoring gate logs, anti-flake baseline logs, manifest checks, summary.

## 8) Stop rules
PASS on deterministic monitoring report generation and preserved baseline gates.
FAIL on schema drift or nondeterministic canonical monitoring fields.

## 9) Risk register
1. Mixing debug-only fields into canonical report → split artifacts by path/contract.
2. Latency metrics unstable due to wall clock usage → use deterministic clock in verify contexts.
3. Overly strict perf thresholds causing flakes → calibrate using deterministic fixtures.
4. Monitoring gate duplicates integration logic → keep targeted assertions only.
5. Regression spillover to execution pipeline → run verify:core pre/post.

## 10) Rollback plan
Revert monitoring/perf schema hooks and keep existing report behavior while preserving baseline gates.
