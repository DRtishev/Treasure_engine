# CALM_MODE_P0_CLOSEOUT.md — Calm Mode P0 Hardening Closeout

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 4c3eeb8ff082
NEXT_ACTION: Run npm run edge:calm:p0:x2 to verify x2 determinism. Then proceed to INFRA_P0 closeout.

## WHAT CHANGED

- canon.mjs: upgraded RUN_ID resolver (R6/R7), added sha256_raw/sha256_norm (R5),
  D005 semantic guard (R9), volatile marker-only normalization
- write_json_deterministic.mjs: R13 compliant helper (recursive key sort, schema_version, no timestamps)
- canon_selftest.mjs: R10 selftest gate with 7 vectors (6 from CANON_TEST_VECTORS + D005 catch)
- edge_evidence_hashes.mjs: R5 dual-hash + R11 SCOPE_MANIFEST_SHA + ASCII sort
- edge_receipts_chain.mjs: R5 chain on sha256_norm, fixed ordering
- edge_data_court.mjs: SINGLE_SOURCE_MODE default, DC90 outlier detection
- edge_calm_mode_p0.mjs: orchestrator pipeline
- SSOT files: NODE_TRUTH.md, VERIFY_MODE.md, BUNDLE_CONTRACT.md, EVIDENCE_CANON_RULES.md,
  UPDATE_SCOPE_POLICY.md, DATA_CONFIRM_POLICY.md, DELTA_CALC_SPEC.md,
  GOLDENS_APPLY_PROTOCOL.md, FORMAT_POLICY.md

## Gate Matrix

| Gate | Status | Blocker |
|------|--------|---------|
| CANON_SELFTEST | PASS | YES |
| DATA_COURT | PASS | NO |
| CHECKSUMS | PASS | YES |
| RECEIPTS_CHAIN | PASS | YES |

## Pipeline Steps

| Step | Status | Exit Code |
|------|--------|-----------|
| CANON_SELFTEST | PASS | 0 |
| DATA_COURT | PASS | 0 |
| EVIDENCE_HASHES | PASS | 0 |
| RECEIPTS_CHAIN | PASS | 0 |

## Hashes

| Field | Value |
|-------|-------|
| scope_manifest_sha | `a271146caebc16bc645344cb29f469f9d44d2dfeb5a01787acd61c410efed269` |
| norm_rules_sha | `021ba0511726a903c5d184a555e10a5137eae2eeed9e3df597b23eca255ac496` |
| closeout_sha256_raw | `66f7fcf2a165122347f05af0bd904652394e7041e8a08565d220877b0cbef1e5` |
| closeout_sha256_norm | `4cce0a9c82d92315392d842a5efe1268dc023f0440540ebe338a77d151326a3e` |

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md
- reports/evidence/EDGE_LAB/P0/CHECKSUMS.md
- reports/evidence/EDGE_LAB/P0/DATA_COURT.md
- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
- reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md
- reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json
- reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json

## Real Risks

1. DC90 (NEEDS_DATA): paper_evidence.json not provided — DATA_COURT remains NEEDS_DATA until artifacts present
2. Network dependency: deps_offline_install_contract may report DEP01 if npm cache is not seeded
3. RUN_ID stability: requires x2 run with identical TREASURE_RUN_ID or stable git HEAD

## Trading Status

TRADING: OFF (P0 zero-war policy — T000 guard active)
