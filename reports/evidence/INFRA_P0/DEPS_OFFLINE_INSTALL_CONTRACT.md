# DEPS_OFFLINE_INSTALL_CONTRACT.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 2c52a286482d
NEXT_ACTION: No action required. Dependencies are fully offline-satisfiable.

## Methodology

**Primary (B3 fix): Static lock scan** — parses package-lock.json for:
- Packages with `hasInstallScript=true`
- Packages with dependencies on: node-gyp, prebuild-install, node-pre-gyp, node-pre-gyp-init
This is deterministic and not affected by --dry-run illusions.

**Secondary: Closed-port registry test** — npm_config_registry=http://127.0.0.1:9 + prefer-offline.
Runs npm install --dry-run twice (x2 anti-flake) for DEP01/DEP03 detection.

## Native Candidates (Static Lock Scan)

| Package | Version | Reasons |
|---------|---------|---------|
| `better-sqlite3` | 12.6.2 | hasInstallScript=true, dep:prebuild-install |

## Dry-Run Results

| Metric | Run 1 | Run 2 |
|--------|-------|-------|
| exit_code | 0 | 0 |
| duration_ms | 527 | 503 |
| registry_patterns | 0 | 0 |
| native_patterns (runtime) | 0 | 0 |
| optional_native_allowed | true | - |
| optional_native_installed | false | - |
| ENABLE_SQLITE_PERSISTENCE | 0 | - |
| x2_drift | false | - |

## Outcome

**PASS** — NONE

All dependencies satisfiable offline (no registry/network required). x2 runs consistent. Exit codes: [0, 0].

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json
- reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md
