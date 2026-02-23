# INFRA_P0_CLOSEOUT.md — Infrastructure P0 Hardening Closeout

STATUS: FAIL
REASON_CODE: NT02
RUN_ID: 6eec9cd2d45e
ELIGIBLE_FOR_MICRO_LIVE: false
ELIGIBLE_FOR_EXECUTION: false
ELIGIBILITY_REASON: No blocking codes detected (DEP/FG01/ZW01/NET01 all clear)
NEXT_ACTION: Fix NODE_TRUTH before proceeding.

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
| eligible_for_micro_live | false | No blocking codes detected (DEP/FG01/ZW01/NET01 all clear) |
| eligible_for_execution | false | No blocking codes detected (DEP/FG01/ZW01/NET01 all clear) |

**Note:** Infra closeout may PASS overall while eligibility is false.
Readiness gate MUST honour these flags and emit BLOCKED with the same DEP reason code.
See: EDGE_LAB/DEP_POLICY.md (R12 fail-closed propagation rule).

## Evidence Hashes

| Evidence Path | sha256_raw (prefix) | sha256_norm (prefix) |
|--------------|--------------------|--------------------|
| `reports/evidence/INFRA_P0/NET_ISOLATION_PROOF.md` | `ffbf6a1df631f5e5…` | `ffbf6a1df631f5e5…` |
| `reports/evidence/INFRA_P0/NODE_TRUTH_GATE.md` | `486d0e859ebee7f0…` | `486d0e859ebee7f0…` |
| `reports/evidence/INFRA_P0/VERIFY_MODE_GATE.md` | `09651974ead28115…` | `09651974ead28115…` |
| `reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md` | `eee8b9b09b084440…` | `eee8b9b09b084440…` |
| `reports/evidence/INFRA_P0/GOLDENS_APPLY_GATE.md` | `bf92a6bc86d6581f…` | `bf92a6bc86d6581f…` |
| `reports/evidence/INFRA_P0/FORMAT_POLICY_GATE.md` | `192af8c20761e166…` | `192af8c20761e166…` |
| `reports/evidence/INFRA_P0/FIXTURE_GUARD_GATE.md` | `d0da28e6ea073ed2…` | `d0da28e6ea073ed2…` |
| `reports/evidence/SAFETY/ZERO_WAR_PROBE.md` | `e8955bf97237fb00…` | `e8955bf97237fb00…` |

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
