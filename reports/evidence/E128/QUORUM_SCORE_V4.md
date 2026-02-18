# E128 QUORUM SCORE V4
- formula: 0.40*rest_ok + 0.35*ws_ok + 0.10*freshness_ok + 0.10*diversity_ok + 0.05*(1-fallback_ratio)
- score: 0.2000
- deductions: rest_missing=0.4, ws_missing=0.35, freshness_fail=0, diversity_fail=0, fallback_penalty=0.0500
