# INFRA_P0_CLOSEOUT.md — Infrastructure P0 Hardening Closeout

STATUS: PASS
REASON_CODE: NONE
RUN_ID: f615eb934eb0
ELIGIBLE_FOR_MICRO_LIVE: false
ELIGIBLE_FOR_EXECUTION: false
ELIGIBILITY_REASON: DEP02: Native build candidates detected via static lock scan: [better-sqlite3@12.6.2]. Native builds require capsule/toolchain policy approval. Cannot claim offline-satisfiable.
NEXT_ACTION: Resolve DEP02 before proceeding to readiness. See EDGE_LAB/DEP_POLICY.md for mitigation paths.

## Gate Matrix

| Gate | Status | Reason Code | Blocker |
|------|--------|-------------|---------|
| NET_ISOLATION | PASS | NONE | YES |
| NODE_TRUTH | PASS | NONE | YES |
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
| `reports/evidence/INFRA_P0/NET_ISOLATION_PROOF.md` | `d358c8bef8fb9221…` | `d358c8bef8fb9221…` |
| `reports/evidence/INFRA_P0/NODE_TRUTH_GATE.md` | `1370a1f4f06b80b3…` | `1370a1f4f06b80b3…` |
| `reports/evidence/INFRA_P0/VERIFY_MODE_GATE.md` | `911e74e6a77ef002…` | `911e74e6a77ef002…` |
| `reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md` | `5b0ebabc126456e4…` | `5b0ebabc126456e4…` |
| `reports/evidence/INFRA_P0/GOLDENS_APPLY_GATE.md` | `9324e1023dd47033…` | `9324e1023dd47033…` |
| `reports/evidence/INFRA_P0/FORMAT_POLICY_GATE.md` | `db284fb7ba437652…` | `db284fb7ba437652…` |
| `reports/evidence/INFRA_P0/FIXTURE_GUARD_GATE.md` | `7c569c18605aaedf…` | `7c569c18605aaedf…` |
| `reports/evidence/SAFETY/ZERO_WAR_PROBE.md` | `99ff3ade02e712ae…` | `99ff3ade02e712ae…` |

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

Resolve DEP02 before proceeding to readiness. See EDGE_LAB/DEP_POLICY.md for mitigation paths.
