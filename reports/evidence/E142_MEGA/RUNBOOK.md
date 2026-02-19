# E142_MEGA RUNBOOK
- run_doctor: npm run -s doctor
- run_mega: CI=true npm run -s verify:mega
- run_probe: CI=true npm run -s verify:mega:probe
- if_blocked: execute NEXT_ACTION exactly once
## RAW
- next_action: CI=true npm run -s verify:mega
- net_class: PROXY_ONLY
