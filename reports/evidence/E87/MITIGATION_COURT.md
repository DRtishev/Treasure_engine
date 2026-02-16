# E87 MITIGATION COURT
- status: PASS
- mitigation_policy_hash: f3daed1d3cb5f20aa9e1e343e8ce4496a9e6ca646b9203c39a313032c627a816
- mitigation_court_fingerprint: 84903f6dc454c506a2d709a3a0886965a4a7c691b8c2a54193c43d8c129dbf7f

| # | reason_code | target | symbol_scope | budgeted_delta | expected_impact | risk | rollback_path |
|---:|---|---|---|---:|---|---|---|
| 1 | SPREAD_BUDGET_HIT | spread | BTCUSDT | 0.05 | lower adverse fill delta | over-tightening | revert BTCUSDT spread delta |
| 2 | SPREAD_BUDGET_HIT | spread | ETHUSDT | 0.05 | lower adverse fill delta | over-tightening | revert ETHUSDT spread delta |
| 3 | SPREAD_BUDGET_HIT | spread | SOLUSDT | 0.05 | lower adverse fill delta | over-tightening | revert SOLUSDT spread delta |
