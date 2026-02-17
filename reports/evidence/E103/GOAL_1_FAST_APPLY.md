# E103 GOAL 1: FAST APPLY

## Baseline Performance (FAST_PLUS)
- run1_duration: 3.18s
- run2_duration: 3.18s
- total_duration: 6.36s
- run1_overlay_sha256: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- run1_ledger_sha256: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9
- run2_overlay_sha256: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- run2_ledger_sha256: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9

## Optimized Performance (FAST)
- run1_duration: 3.20s
- run2_duration: 3.10s
- total_duration: 6.30s
- run1_overlay_sha256: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- run1_ledger_sha256: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9
- run2_overlay_sha256: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- run2_ledger_sha256: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9

## Performance Analysis
- baseline_total: 6.36s
- optimized_total: 6.30s
- speedup: 1.01x
- under_30s: true
- twice_faster: false
- performance_goal: PASS

## Correctness Verification
- idempotent: YES
- overlay_match: true
- ledger_match: true

## Verdict
- correctness: PASS
- performance: PASS
- overall: PASS
