# INFRA_P0_CLOSEOUT.md — Infrastructure P0 Hardening Closeout

STATUS: PASS
REASON_CODE: NONE
RUN_ID: f545a66795e5
NEXT_ACTION: Run edge:calm:p0 to complete full P0 closeout.

## Gate Matrix

| Gate | Status | Reason Code | Blocker |
|------|--------|-------------|---------|
| NODE_TRUTH | PASS | NONE | YES |
| VERIFY_MODE | PASS | NONE | YES |
| DEPS_OFFLINE | FAIL | DEP02 | NO (warn) |
| GOLDENS_APPLY | PASS | NONE | YES |
| FORMAT_POLICY | PASS | NONE | YES |

## Evidence Hashes

| Evidence Path | sha256_raw (prefix) | sha256_norm (prefix) |
|--------------|--------------------|--------------------|
| `reports/evidence/INFRA_P0/NODE_TRUTH_GATE.md` | `195734279642b2c9…` | `195734279642b2c9…` |
| `reports/evidence/INFRA_P0/VERIFY_MODE_GATE.md` | `f6d750ead30f8a39…` | `f6d750ead30f8a39…` |
| `reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL.md` | `a2e82c327707b35b…` | `a2e82c327707b35b…` |
| `reports/evidence/INFRA_P0/GOLDENS_APPLY_GATE.md` | `898c5518242541a8…` | `898c5518242541a8…` |
| `reports/evidence/INFRA_P0/FORMAT_POLICY_GATE.md` | `55b4606037201418…` | `55b4606037201418…` |

## What Changed

- NODE_TRUTH.md: authoritative SSOT for Node.js version governance (allowed_family=22)
- VERIFY_MODE.md: VERIFY_MODE=GIT documented, VM04 format validation
- BUNDLE_CONTRACT.md: bundle fingerprint contract for offline deployments
- GOLDENS_APPLY_PROTOCOL.md: golden update governance (G001/G002)
- FORMAT_POLICY.md: evidence format + machine JSON rules (R13/R14)
- EVIDENCE_CANON_RULES.md: normalization rules with volatile markers (R9)
- UPDATE_SCOPE_POLICY.md: scope change governance (R11)
- DATA_CONFIRM_POLICY.md: data confirmation policy (DC90)
- DELTA_CALC_SPEC.md: delta calculation specification
- scripts/lib/write_json_deterministic.mjs: R13 compliant JSON writer
- scripts/verify/node_truth_gate.mjs: NT01/NT02 gate
- scripts/verify/verify_mode_gate.mjs: VM01-VM04 gate
- scripts/verify/deps_offline_install_contract.mjs: DEP01/02/03 gate
- scripts/verify/goldens_apply_gate.mjs: G001/G002 gate
- scripts/verify/format_policy_gate.mjs: FP01 gate (strict P0 scope)

## Real Risks

1. **DEP02 (FAIL)**: `better-sqlite3` requires native build (node-gyp).
   Mitigation: use prebuilt binaries (`npm install --ignore-scripts` with prebuilt binary) or provision capsule with pre-built .node file.
2. **Legacy FP01 warnings**: 14 pre-existing EDGE_LAB gate JSON files lack schema_version.
   Mitigation: migrate in follow-up PR by adding write_json_deterministic to each generating script.
3. **DEP01**: if npm cache is absent, fresh install would require network (capsule needed).
   Mitigation: pre-seed npm cache or use vendored node_modules in CI.

## Next Action

Run edge:calm:p0 to complete full P0 closeout.
