# DEPS_OFFLINE_INSTALL_CONTRACT.md

STATUS: FAIL
REASON_CODE: DEP02
RUN_ID: cef301f25c52
NEXT_ACTION: Review native dependency. Either pre-build in capsule, use prebuilt binaries, or add to approved native build list.

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
| duration_ms | 1735 | 1762 |
| registry_patterns | 0 | 0 |
| native_patterns (runtime) | 1 | 1 |
| x2_drift | false | - |

## Outcome

**FAIL** — DEP02

Native build candidates detected via static lock scan: [better-sqlite3@12.6.2]. Native builds require capsule/toolchain policy approval. Cannot claim offline-satisfiable.

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json
- reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md
