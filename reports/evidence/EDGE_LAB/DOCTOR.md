# DOCTOR.md — EDGE_LAB System Health Report
generated_at: 2026-02-21T00:00:00.000Z
script: edge_doctor.mjs + P0_HARDENING_ADDENDUM

## System Overview

| Property | Value |
|----------|-------|
| Core courts PASS | Blocked at paper:ingest (ajv not installed — pre-existing, no regression) |
| CALM_MODE_P0 | PASS |
| INFRA_P0 | PASS (DEP02 non-blocking: better-sqlite3 native build) |
| RUN_ID | f545a66795e5 |
| Node | v22.22.0 (family=22, aligned with NODE_TRUTH.md) |
| VERIFY_MODE | GIT |
| Trading | OFF (T000 P0 zero-war policy active) |

## Calm P0 Gates

| Gate | Status | Reason |
|------|--------|--------|
| CANON_SELFTEST | PASS | 7/7 vectors pass, D005 guard verified |
| DATA_COURT | PASS | paper_evidence.json present (1 file, no conflict) |
| CHECKSUMS | PASS | 86 files hashed (sha256_raw + sha256_norm), SCOPE_MANIFEST_SHA set |
| RECEIPTS_CHAIN | PASS | 86 entries chained on sha256_norm |

## Infra P0 Gates

| Gate | Status | Reason |
|------|--------|--------|
| NODE_TRUTH | PASS | v22.22.0 matches allowed_family=22 |
| VERIFY_MODE | PASS | VERIFY_MODE=GIT, RUN_ID=f545a66795e5 |
| DEPS_OFFLINE | FAIL DEP02 | better-sqlite3 native build (non-blocking, known) |
| GOLDENS_APPLY | PASS | 14 golden files, protocol present |
| FORMAT_POLICY | PASS | strict scope (5 new files), 14 legacy WARN scheduled |

## Blockers

- Pre-existing: edge:all blocked at edge:paper:ingest (ajv devDependency not installed — no regression from P0 hardening)
- Known risk: DEP02 (better-sqlite3 native build) — non-blocking, documented in INFRA_P0_CLOSEOUT.md

## NEXT_ACTION

Run `npm run p0:all` to re-verify full CALM+INFRA P0 gate suite.
Install devDependencies (`npm install`) to unblock edge:all pipeline (pre-existing).

## P0 Evidence Paths

- reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md
- reports/evidence/EDGE_LAB/P0/CHECKSUMS.md
- reports/evidence/EDGE_LAB/P0/DATA_COURT.md
- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
- reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md
- reports/evidence/INFRA_P0/NODE_TRUTH_GATE.md
- reports/evidence/INFRA_P0/VERIFY_MODE_GATE.md
- reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL.md
- reports/evidence/INFRA_P0/GOLDENS_APPLY_GATE.md
- reports/evidence/INFRA_P0/FORMAT_POLICY_GATE.md
- reports/evidence/INFRA_P0/INFRA_P0_CLOSEOUT.md
