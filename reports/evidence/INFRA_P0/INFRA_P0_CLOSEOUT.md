# INFRA_P0_CLOSEOUT.md — Infrastructure P0 Hardening Closeout

STATUS: FAIL
REASON_CODE: NT02
RUN_ID: 71bc743467cc
ELIGIBLE_FOR_MICRO_LIVE: false
ELIGIBLE_FOR_EXECUTION: false
ELIGIBILITY_REASON: overallStatus=FAIL (eligibility requires overallStatus === PASS)
NEXT_ACTION: nvm use 22.22.0

## Gate Matrix

| Gate | Status | Reason Code | Blocker |
|------|--------|-------------|---------|
| NET_ISOLATION | PASS | NONE | YES |
| NODE_TRUTH | FAIL | NT02 | YES |
| VERIFY_MODE | PASS | NONE | YES |
| DEPS_OFFLINE | PASS | NONE | NO (warn) |
| GOLDENS_APPLY | PASS | NONE | YES |
| FORMAT_POLICY | PASS | NONE | YES |
| FIXTURE_GUARD | PASS | NONE | YES |
| ZERO_WAR_PROBE | PASS | NONE | YES |

## Eligibility Flags (R12/R13)

| Flag | Value | Reason |
|------|-------|--------|
| eligible_for_micro_live | false | overallStatus=FAIL (eligibility requires overallStatus === PASS) |
| eligible_for_execution | false | overallStatus=FAIL (eligibility requires overallStatus === PASS) |

**Note:** Infra closeout may PASS overall while eligibility is false.
Readiness gate MUST honour these flags and emit BLOCKED with the same DEP reason code.
See: EDGE_LAB/DEP_POLICY.md (R12 fail-closed propagation rule).

## Evidence Hashes

| Evidence Path | sha256_raw (prefix) | sha256_norm (prefix) |
|--------------|--------------------|--------------------|
| `reports/evidence/INFRA_P0/NET_ISOLATION_PROOF.md` | `6f9f05c73d816ec6…` | `6f9f05c73d816ec6…` |
| `reports/evidence/INFRA_P0/NODE_TRUTH_GATE.md` | `f0c9e5128e2e3375…` | `f0c9e5128e2e3375…` |
| `reports/evidence/INFRA_P0/VERIFY_MODE_GATE.md` | `863fb7edcc4d764d…` | `863fb7edcc4d764d…` |
| `reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md` | `355582597f696e11…` | `355582597f696e11…` |
| `reports/evidence/INFRA_P0/GOLDENS_APPLY_GATE.md` | `a6cc54b851a1c61c…` | `a6cc54b851a1c61c…` |
| `reports/evidence/INFRA_P0/FORMAT_POLICY_GATE.md` | `5d6ffe40a18f1bc9…` | `5d6ffe40a18f1bc9…` |
| `reports/evidence/INFRA_P0/FIXTURE_GUARD_GATE.md` | `da6e6cb9f1b2b0aa…` | `da6e6cb9f1b2b0aa…` |
| `reports/evidence/SAFETY/ZERO_WAR_PROBE.md` | `9370ce5c62c8cfb0…` | `9370ce5c62c8cfb0…` |

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

nvm use 22.22.0
