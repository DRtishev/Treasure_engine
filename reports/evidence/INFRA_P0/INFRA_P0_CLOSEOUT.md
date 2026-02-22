# INFRA_P0_CLOSEOUT.md — Infrastructure P0 Hardening Closeout

STATUS: FAIL
REASON_CODE: NT02
RUN_ID: cad9c4ea3904
ELIGIBLE_FOR_MICRO_LIVE: false
ELIGIBLE_FOR_EXECUTION: false
ELIGIBILITY_REASON: DEP02: Native build candidates detected via static lock scan: [better-sqlite3@12.6.2]. Native builds require capsule/toolchain policy approval. Cannot claim offline-satisfiable.
NEXT_ACTION: Fix NODE_TRUTH before proceeding.

## Gate Matrix

| Gate | Status | Reason Code | Blocker |
|------|--------|-------------|---------|
| NET_ISOLATION | PASS | NONE | YES |
| NODE_TRUTH | FAIL | NT02 | YES |
| VERIFY_MODE | PASS | NONE | YES |
| DEPS_OFFLINE | FAIL | DEP02 | NO (warn) |
| GOLDENS_APPLY | PASS | NONE | YES |
| FORMAT_POLICY | PASS | NONE | YES |
| FIXTURE_GUARD | PASS | NONE | YES |
| ZERO_WAR_PROBE | PASS | NONE | YES |

## Eligibility Flags (R12/R13)

| Flag | Value | Reason |
|------|-------|--------|
| eligible_for_micro_live | false | DEP02: Native build candidates detected via static lock scan: [better-sqlite3@12.6.2]. Native builds require capsule/toolchain policy approval. Cannot claim offline-satisfiable. |
| eligible_for_execution | false | DEP02: Native build candidates detected via static lock scan: [better-sqlite3@12.6.2]. Native builds require capsule/toolchain policy approval. Cannot claim offline-satisfiable. |

**Note:** Infra closeout may PASS overall while eligibility is false.
Readiness gate MUST honour these flags and emit BLOCKED with the same DEP reason code.
See: EDGE_LAB/DEP_POLICY.md (R12 fail-closed propagation rule).

## Evidence Hashes

| Evidence Path | sha256_raw (prefix) | sha256_norm (prefix) |
|--------------|--------------------|--------------------|
| `reports/evidence/INFRA_P0/NET_ISOLATION_PROOF.md` | `3dbdca0efd1d19cd…` | `3dbdca0efd1d19cd…` |
| `reports/evidence/INFRA_P0/NODE_TRUTH_GATE.md` | `283fe858d6a4fa50…` | `283fe858d6a4fa50…` |
| `reports/evidence/INFRA_P0/VERIFY_MODE_GATE.md` | `3d179b55c1b3a962…` | `3d179b55c1b3a962…` |
| `reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md` | `b87b99891f9135e4…` | `b87b99891f9135e4…` |
| `reports/evidence/INFRA_P0/GOLDENS_APPLY_GATE.md` | `3e2b9c59e1782ee7…` | `3e2b9c59e1782ee7…` |
| `reports/evidence/INFRA_P0/FORMAT_POLICY_GATE.md` | `53d2d83aa06f7b51…` | `53d2d83aa06f7b51…` |
| `reports/evidence/INFRA_P0/FIXTURE_GUARD_GATE.md` | `b336206823b032dd…` | `b336206823b032dd…` |
| `reports/evidence/SAFETY/ZERO_WAR_PROBE.md` | `bb3fc57639811a01…` | `bb3fc57639811a01…` |

## What Changed (v1.5.3 patchset)

- DEPS_OFFLINE evidence renamed: DEPS_OFFLINE_INSTALL_CONTRACT.md (EVIDENCE_NAMING_SSOT)
- infra_p0_closeout.json: now emits eligible_for_micro_live + eligible_for_execution (R13)
- DEP02 propagation: INFRA FAIL DEP02 → EDGE BLOCKED DEP02 (R12, sealed via dep02_failclosed_readiness_gate)
- EDGE_LAB/DEP_POLICY.md: new SSOT documenting DEP propagation governance

## Real Risks

1. **DEP02 (FAIL)**: `better-sqlite3` requires native build (node-gyp).
   eligible_for_micro_live=false until resolved.
   Mitigation: use prebuilt binaries or provision capsule with pre-built .node file.
2. **Legacy FP01 warnings**: 14 pre-existing EDGE_LAB gate JSON files lack schema_version.
   Mitigation: migrate in follow-up PR.
3. **DEP01**: if npm cache is absent, fresh install would require network (capsule needed).
   Mitigation: pre-seed npm cache or use vendored node_modules in CI.

## Next Action

Fix NODE_TRUTH before proceeding.
