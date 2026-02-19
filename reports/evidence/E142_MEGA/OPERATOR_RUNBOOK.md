# E142_MEGA OPERATOR RUNBOOK
- phone_flow_1: npm run -s doctor
- phone_flow_2: CI=true npm run -s verify:mega
- if_blocked: follow NEXT_ACTION from doctor output exactly
- export_bundle: npm run -s verify:mega:export
- import_accept: npm run -s verify:mega:import -- --archive <path>
## RAW
- net_class: ONLINE_SKIPPED_FLAGS
