# EDGE_PROFIT_00 Import Guide (Offline CSV -> SSOT JSONL)

## Goal

Import real paper telemetry from a local CSV export into the SSOT file:

- input: `artifacts/incoming/raw_paper_telemetry.csv`
- output: `artifacts/incoming/paper_telemetry.jsonl`
- marker: `artifacts/incoming/paper_telemetry.profile` set to `real`

## Command

```bash
npm run -s edge:profit:00:import:csv
```

## Deterministic rules

- Strict header + required fields.
- Strict timestamps (`YYYY-MM-DDTHH:MM:SSZ`).
- Stable output ordering by (`signal_id`, `ts`, `symbol`).
- Duplicate key rows are rejected (`signal_id|ts|symbol`).
- Ambiguous/invalid rows => `BLOCKED`.

## Import reason codes

- `IM01` — missing input CSV.
- `IM02` — missing required columns.
- `IM03` — quoted/ambiguous CSV detected.
- `IM04` — duplicate key detected.
- `IM05` — parse/validation error at a concrete row.

Importer diagnostics in `reports/evidence/EDGE_PROFIT_00/real/IMPORT_CSV.md` include:

- `CODE`
- `WHY`
- `SIGNATURES`
- single `NEXT_ACTION`

## One-command REAL pipeline

```bash
npm run -s edge:profit:00:real:run
```


## Schema signature

Importer emits deterministic `schema_signature` into:
- `reports/evidence/EDGE_PROFIT_00/real/IMPORT_CSV.md`
- `reports/evidence/EDGE_PROFIT_00/real/gates/manual/import_csv.json`
