# DEPS_OFFLINE_INSTALL_CONTRACT.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3d37e68311e2
NEXT_ACTION: No action required. Dependencies are fully offline-satisfiable.

## Methodology

Uses closed-port registry (npm_config_registry=http://127.0.0.1:9) + prefer-offline.
Runs npm install --dry-run twice (x2 anti-flake).
Scans stderr + stdout for registry fetch / native build / drift patterns.

## Results

| Metric | Run 1 | Run 2 |
|--------|-------|-------|
| exit_code | 0 | 0 |
| duration_ms | 1844 | 1768 |
| registry_patterns | 0 | 0 |
| native_patterns | 0 | 0 |
| x2_drift | false | - |

## Outcome

**PASS** — NONE

All dependencies satisfiable offline (no registry/network required). x2 runs consistent. Exit codes: [0, 0].

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json
- reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md
