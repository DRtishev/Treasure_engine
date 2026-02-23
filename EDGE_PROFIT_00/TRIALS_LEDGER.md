# TRIALS_LEDGER.md — EDGE_PROFIT_00 (Append-Only)

Schema (strict, append-only):
- Format: `trial_id|hypothesis_id|dataset_sha|result_sha|verdict`
- `trial_id` must be unique; never delete or rewrite prior lines.
- Mutation protocol: PROPOSE -> APPLY (with evidence receipts).

# Entries
T001|HYP-0001|sha256:1111111111111111111111111111111111111111111111111111111111111111|sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|PASS
T002|HYP-0002|sha256:2222222222222222222222222222222222222222222222222222222222222222|sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|PASS
T003|HYP-0003|sha256:3333333333333333333333333333333333333333333333333333333333333333|sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc|BLOCKED
