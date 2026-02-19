# E139 OPERATOR RUNBOOK
1. verify:offline — use for offline deterministic checks only.
2. verify:probe — use on Node<22 for NON_AUTHORITATIVE diagnostics only.
3. verify:authoritative — use on Node>=22 (`npm run -s verify:e139`).
4. verify:online — use only with `ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1` and `ONLINE_OPTIONAL=1|ONLINE_REQUIRED=1`.
