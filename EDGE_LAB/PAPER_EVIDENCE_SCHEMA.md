# PAPER_EVIDENCE_SCHEMA.md — Telemetry First Input Contract

Accepted input files (prefer JSONL):
- `artifacts/incoming/paper_telemetry.jsonl`
- `artifacts/incoming/paper_telemetry.csv`

Required MVP fields per row:
- `ts`
- `symbol`
- `side`
- `signal_id`
- `intended_entry`
- `intended_exit`
- `fill_price`
- `fee`
- `slippage_bps`
- `latency_ms`
- `result_pnl`
- `source_tag`

## Policy

- Missing telemetry file => `NEEDS_DATA` / `NDA02`.
- Outliers are marked, never deleted.
- Severe data conflicts => `BLOCKED` / `DC90`.
- Determinism required: stable sort by (`signal_id`, `ts`, `symbol`) and deterministic summaries.
## Machine JSON timestamp normalization

- Machine JSON under `reports/evidence/**/gates/**` must not contain ISO-8601 timestamps.
- Normalized time keys must use `YYYY-MM-DD_HH:MM:SS` (e.g., from `ts`) or a deterministic integer index.
