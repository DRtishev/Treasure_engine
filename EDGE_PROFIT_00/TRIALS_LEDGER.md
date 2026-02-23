# TRIALS_LEDGER.md — EDGE_PROFIT_00 (Append-Only)

Schema (strict, append-only):
- Format: `trial_id|hypothesis_id|dataset_sha|result_sha|verdict`
- `trial_id` must be unique; never delete or rewrite prior lines.
- Mutation protocol: PROPOSE -> APPLY (with evidence receipts).

# Entries
