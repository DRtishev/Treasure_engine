# EXECUTOR Stable Receipts — SSOT Doctrine

## Rule

All gate receipts written to `reports/evidence/EXECUTOR/**` MUST use `run_id: "STABLE"` instead of the HEAD commit SHA.

## Why

EXECUTOR receipts are audit-grade outputs that track gate PASS/FAIL status. Embedding the HEAD SHA caused every commit to dirty all 38+ receipt files — pure git churn with zero information gain. The real run-scoped SHA belongs in `reports/evidence/EPOCH-*/**` evidence only.

## Mechanism

- `scripts/edge/edge_lab/canon.mjs` exports `EXECUTOR_RUN_ID = 'STABLE'`.
- `writeMd()` auto-normalizes `RUN_ID:` lines when the output path contains `reports/evidence/EXECUTOR`.
- `writeJsonDeterministic()` auto-normalizes the `run_id` field for the same path pattern.
- No individual gate script needs modification — normalization is centralized.

## Invariants

| ID | Rule |
|----|------|
| PR07 | EXECUTOR receipts are byte-identical across runs with different HEAD |
| PR08 | `STABLE` token MUST NOT appear in `run_id` fields outside EXECUTOR |

## Gates

- `RG_PR07_EXECUTOR_RUNID_IMMUTABLE` — determinism proof (verify:fast)
- `RG_PR08_EXECUTOR_STABLE_ONLY` — scope containment (verify:fast)
