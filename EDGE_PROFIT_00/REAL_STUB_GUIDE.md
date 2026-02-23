# REAL_STUB_GUIDE.md

Generate deterministic REAL_STUB telemetry offline:

```bash
npm run -s edge:profit:00:real:stub
```

Outputs:
- `artifacts/incoming/raw_paper_telemetry.csv`
- `artifacts/incoming/paper_telemetry.profile` (`real`)
- `reports/evidence/EDGE_PROFIT_00/real/REAL_STUB_GENERATION.md`

The data is synthetic and tagged `REAL_STUB_V1`; eligibility remains REAL, and Doctor should surface that this run source is REAL_STUB.
