# REAL_DROP_CONTRACT.md

## Purpose

Single-operator input contract for REAL paper telemetry ingestion.

## Required input artifact

- `artifacts/incoming/REAL_DROP.tar.gz`

## Archive contents (strict)

The tarball must contain only root-level files:

- `raw_paper_telemetry.csv` (required)
- `metadata.json` (optional)

No directories, no nested paths, and no extra files are allowed.

## Validation and unpack command

Run:

```bash
npm run -s edge:profit:00:real:drop:unpack
```

Validation behavior:

- Missing archive => `NEEDS_DATA` with reason code `RDROP01`
- Unsafe paths, nested entries, absolute paths, traversal, invalid file set => `FAIL` with reason code `RDROP02`
- PASS extracts allowed files into `artifacts/incoming/`, overwriting deterministically.
- PASS writes profile marker `artifacts/incoming/paper_telemetry.profile` with value `real`.

## Evidence outputs

- `reports/evidence/EDGE_PROFIT_00/real/REAL_DROP_UNPACK.md`
- `reports/evidence/EDGE_PROFIT_00/real/gates/manual/real_drop_unpack.json`
