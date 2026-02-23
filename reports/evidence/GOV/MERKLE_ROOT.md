# MERKLE_ROOT.md — P1 Evidence Integrity Anchor

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 312268916f58

## Merkle Root

MERKLE_ROOT: `172cb6ccf5259d36ac9c7320d0bdb7d2992e8b3311dded43fe2a76a369178bce`

## Scope

| Field | Value |
|-------|-------|
| scope_manifest_sha | `a202ce963b6330f554b6f387cb0151e60d81af24a699ae9f2c2499a978a4040f` |
| files_in_scope | 115 |
| files_hashed | 115 |
| files_missing | 0 |
| tree_depth | 8 |
| leaves_count | 115 |

## Algorithm

- Scope: same as CHECKSUMS.md (EDGE_LAB/P0/*.md + EDGE_LAB/gates/manual/*.json + EDGE_LAB/*.md + scripts/edge/edge_lab/*.mjs)
- Sort: ASCII lexicographic (R11)
- Leaf hash: sha256_raw(relpath + ":" + sha256_norm(content))
- Parent hash: sha256_raw(left_hash + right_hash)
- Odd level: duplicate last leaf (standard Merkle padding)
- Root: single hash at top of binary tree

## Leaf Hashes (first 20 of 115)

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
| `EDGE_LAB/EVIDENCE_INDEX.md` | `56aad35b4e8ce8fe1a03c65d…` | `3bee6a4722a1ba56fd2ffa12…` |
| `EDGE_LAB/EXECUTION_MODEL.md` | `c30a5b225fddbaf008cd0c6c…` | `6072ee361588d9ea048acf2e…` |
| `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `ed7e918351d218bc2d5c88b6…` | `79c313a9e3578c25d2b81eb1…` |
| `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `afb2fb87fd2d2fb3a23892e8…` | `2ef6481e548f8cead408f269…` |
| `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `792160fe2cdf39c765f6131b…` | `7cff212a4ce580c4ab3ef66b…` |
| `EDGE_LAB/EXPECTANCY_POLICY.md` | `5a56af688e0e815f57753f5c…` | `c7a45d923b14dc19041e0959…` |
| `EDGE_LAB/FINAL_VERDICT.md` | `3637512a3afa07aac96a8e1a…` | `b2e1fa479794a2d86c51337c…` |
| `EDGE_LAB/GATE_FSM_SPEC.md` | `ee44eaa4af58790ae41b4cb4…` | `381bf240e65dbe9211ddc4e1…` |
| `EDGE_LAB/HACK_REGISTRY.md` | `379c3a73e7faa24caaca8855…` | `9e40f7916cb116cba1ee2476…` |
| `EDGE_LAB/HACK_SCHEMA.md` | `adf83e6399e1ec060447e851…` | `93ebb1445493c3cb68fb17db…` |
| `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `53b3d58502079be6513b1a5a…` | `ceda190573d8016db8290f70…` |
| `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `939d9297cca9e84ac4753b53…` | `7360902b98e192ac6cbd1633…` |
| … (95 more rows) | … | … |

## GOV01 Usage

GOV01 (gov01_evidence_integrity.mjs) recomputes this Merkle root at runtime
and compares to the anchored value above. Any mismatch => BLOCKED GOV01.

## Evidence Paths

- reports/evidence/GOV/MERKLE_ROOT.md
- reports/evidence/GOV/gates/manual/merkle_root.json
