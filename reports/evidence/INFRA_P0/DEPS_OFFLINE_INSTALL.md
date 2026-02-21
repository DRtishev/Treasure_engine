# DEPS_OFFLINE_INSTALL.md

STATUS: FAIL
REASON_CODE: DEP02
RUN_ID: f545a66795e5
NEXT_ACTION: Review native dependency. Either pre-build in capsule, use prebuilt binaries, or add to approved native build list.

## Methodology

Uses closed-port registry (npm_config_registry=http://127.0.0.1:9) + prefer-offline.
Runs npm install --dry-run twice (x2 anti-flake).
Scans stderr + stdout for registry fetch / native build / drift patterns.

## Results

| Metric | Run 1 | Run 2 |
|--------|-------|-------|
| exit_code | 0 | 0 |
| duration_ms | 1957 | 1979 |
| registry_patterns | 0 | 0 |
| native_patterns | 1 | 1 |
| x2_drift | false | - |

## Outcome

**FAIL** — DEP02

Native build (node-gyp or equivalent) detected during offline install check. Native builds require capsule/toolchain policy approval.

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json
- reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL.md
