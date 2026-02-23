# MERKLE_ROOT.md — P1 Evidence Integrity Anchor

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 1e93566551e0

## Merkle Root

MERKLE_ROOT: `083d3d0c92377bc9d134c1f19c2dccb139d2192e0b849fa9add09f3715b7deca`

## Scope

| Field | Value |
|-------|-------|
| scope_manifest_sha | `b58e9929b24f9461d993b38c1c5fab0c8350f955a9b4d11061498b18089cc775` |
| files_in_scope | 121 |
| files_hashed | 121 |
| files_missing | 0 |
| tree_depth | 8 |
| leaves_count | 121 |

## Algorithm

- Scope: same as CHECKSUMS.md (EDGE_LAB/P0/*.md + EDGE_LAB/gates/manual/*.json + EDGE_LAB/*.md + scripts/edge/edge_lab/*.mjs)
- Sort: ASCII lexicographic (R11)
- Leaf hash: sha256_raw(relpath + ":" + sha256_norm(content))
- Parent hash: sha256_raw(left_hash + right_hash)
- Odd level: duplicate last leaf (standard Merkle padding)
- Root: single hash at top of binary tree

## Leaf Hashes (first 20 of 121)

| Path | Leaf Hash (prefix) | sha256_norm (prefix) |
|------|-------------------|---------------------|
| `EDGE_LAB/ATTEMPT_LEDGER_POLICY.md` | `c148aedafa1a0ed16d105231…` | `1f1334d42190915eb2c5c8e5…` |
| `EDGE_LAB/COURT_MANIFEST.md` | `9fd83d582cac2f2e730e92e7…` | `6413adbce60c222f3ddbdec9…` |
| `EDGE_LAB/DATASET_CONTRACT.md` | `c941f454c35359f0fad79cb5…` | `d58e82f882583db6c098e6fc…` |
| `EDGE_LAB/DATA_CONFIRM_POLICY.md` | `f3b6b27716f7bdc44f609087…` | `0dc429f5041c59763ee387e8…` |
| `EDGE_LAB/DELTA_CALC_SPEC.md` | `66474646d3b522473d187117…` | `875dc47af399cd0663df7272…` |
| `EDGE_LAB/DEP_POLICY.md` | `80f9a7a6e82facebcb7c037d…` | `857c544a6609997b167737b6…` |
| `EDGE_LAB/ERROR_BUDGET_POLICY.md` | `62b64203a888ac4e3c4ebf10…` | `fbd5cc865ac70276692369d2…` |
| `EDGE_LAB/EVIDENCE_CANON_RULES.md` | `17500f0002bc79ea0e853c7d…` | `021ba0511726a903c5d184a5…` |
| `EDGE_LAB/EVIDENCE_INDEX.md` | `175502aa1dd5e51498792f59…` | `85775b0745d8591a6f76f1fd…` |
| `EDGE_LAB/EXECUTION_MODEL.md` | `c30a5b225fddbaf008cd0c6c…` | `6072ee361588d9ea048acf2e…` |
| `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `ed7e918351d218bc2d5c88b6…` | `79c313a9e3578c25d2b81eb1…` |
| `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `afb2fb87fd2d2fb3a23892e8…` | `2ef6481e548f8cead408f269…` |
| `EDGE_LAB/EXECUTOR_ENTRYPOINT_DOCTRINE.md` | `efc380acef6a03e200cd3484…` | `b7c2ce5051762b3b5112f8a9…` |
| `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `792160fe2cdf39c765f6131b…` | `7cff212a4ce580c4ab3ef66b…` |
| `EDGE_LAB/EXPECTANCY_POLICY.md` | `5a56af688e0e815f57753f5c…` | `c7a45d923b14dc19041e0959…` |
| `EDGE_LAB/FINAL_VERDICT.md` | `812a0aaf36b912499e778e48…` | `677021e9ed48ca449aab4f45…` |
| `EDGE_LAB/GATE_FSM_SPEC.md` | `ee44eaa4af58790ae41b4cb4…` | `381bf240e65dbe9211ddc4e1…` |
| `EDGE_LAB/HACK_REGISTRY.md` | `379c3a73e7faa24caaca8855…` | `9e40f7916cb116cba1ee2476…` |
| `EDGE_LAB/HACK_SCHEMA.md` | `adf83e6399e1ec060447e851…` | `93ebb1445493c3cb68fb17db…` |
| `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `53b3d58502079be6513b1a5a…` | `ceda190573d8016db8290f70…` |
| … (101 more rows) | … | … |

## GOV01 Usage

GOV01 (gov01_evidence_integrity.mjs) recomputes this Merkle root at runtime
and compares to the anchored value above. Any mismatch => BLOCKED GOV01.

## Evidence Paths

- reports/evidence/GOV/MERKLE_ROOT.md
- reports/evidence/GOV/gates/manual/merkle_root.json
