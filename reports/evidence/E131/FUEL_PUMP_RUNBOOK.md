# E131 FUEL PUMP RUNBOOK
- objective: collect market snapshots externally when Codex runtime egress is blocked.
- step_1: run `node scripts/fuel_pump/build_capsule.mjs --out artifacts/incoming/fuel_capsule` on VPS/local with egress.
- step_2: copy produced manifest + JSONL into `artifacts/incoming/`.
- step_3: run `node scripts/fuel_pump/import_capsule.mjs artifacts/incoming/fuel_capsule` in this repo.
- step_4: rerun `CI=false OFFLINE_ONLY=1 npm run -s verify:e131` for deterministic offline verify.
