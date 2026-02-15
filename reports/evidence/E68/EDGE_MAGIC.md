# E68 EDGE MAGIC
- mode: deterministic offline alpha simulation
- fixture: core/edge/fixtures/edge_magic_v1.csv
- env_normalization:
  - TZ=UTC
  - LANG=C
  - LC_ALL=C
  - SOURCE_DATE_EPOCH=1700000000 (default)
  - SEED=12345 (default)
- source: RUNS_EDGE_MAGIC_X2.md
