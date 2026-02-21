# CANON_TEST_VECTORS.md — Canon Normalization Test Vectors

version: 1.0.0
ssot_type: CANON_TEST_VECTORS
last_updated: 2026-02-21

## Purpose

6 test lines (2 volatile, 2 semantic, 2 boundary) used by canon_selftest.mjs
to verify that stableEvidenceNormalize:
1. Normalizes volatile lines correctly
2. Does NOT modify semantic (non-volatile) lines
3. Does NOT trigger D005 on semantic lines
4. Handles boundary cases correctly

## Test Vectors

### Vector 1 — Volatile: generated_at timestamp
```
INPUT:  generated_at: 2026-02-21T12:00:00.000Z
EXPECT: timestamp replaced with RUN_ID
TYPE:   VOLATILE
MARKER: generated_at:
```

### Vector 2 — Volatile: Started timestamp
```
INPUT:  Started: 2026-01-15T08:30:00.500Z
EXPECT: timestamp replaced with RUN_ID
TYPE:   VOLATILE
MARKER: Started:
```

### Vector 3 — Semantic: threshold line (MUST NOT be changed)
```
INPUT:  threshold: 0.015
EXPECT: line unchanged (D005 guard — non-volatile semantic line)
TYPE:   SEMANTIC
FORBIDDEN_TOKEN: threshold
```

### Vector 4 — Semantic: drawdown line (MUST NOT be changed)
```
INPUT:  max_drawdown: -12.5%
EXPECT: line unchanged (D005 guard — non-volatile semantic line)
TYPE:   SEMANTIC
FORBIDDEN_TOKEN: drawdown
```

### Vector 5 — Boundary: non-volatile line without forbidden token
```
INPUT:  strategy: ATR_SQUEEZE_BREAKOUT
EXPECT: line unchanged (non-volatile, no forbidden token — no D005)
TYPE:   BOUNDARY
```

### Vector 6 — Boundary: volatile ms timing line
```
INPUT:  Completed: 2026-02-21T09:00:00.123Z (took 1234ms)
EXPECT: timestamp replaced with RUN_ID, ms replaced with RUN_MS
TYPE:   VOLATILE
MARKER: Completed:
```

## Selftest Expectations

| # | Type | Input Contains | Expected Outcome |
|---|------|---------------|------------------|
| 1 | VOLATILE | generated_at: + ISO timestamp | timestamp → RUN_ID |
| 2 | VOLATILE | Started: + ISO timestamp | timestamp → RUN_ID |
| 3 | SEMANTIC | threshold: + numeric value | UNCHANGED (D005 safe) |
| 4 | SEMANTIC | max_drawdown: + numeric value | UNCHANGED (D005 safe) |
| 5 | BOUNDARY | strategy: + non-forbidden value | UNCHANGED (no-op) |
| 6 | VOLATILE | Completed: + ISO timestamp + ms | timestamp → RUN_ID, ms → RUN_MS |
