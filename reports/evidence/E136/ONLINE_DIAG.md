# E136 ONLINE DIAG
- mode: OFFLINE_ONLY
- enabled: false
- reason: ENABLE_NET not set
- status: SKIPPED
## To run online diag:
- Command: ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 ONLINE_OPTIONAL=1 node scripts/verify/e136_online_diag.mjs
- Or: npm run -s verify:e136:online
- Note: This will overwrite ONLINE_DIAG.md and regenerate SHA256SUMS.md.
