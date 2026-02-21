# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: f545a66795e5
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 86 |
| final_chain_hash | `fc3d2f8fdc5e9d365bc4fe3fb5d7e0d16a2522bc687b9e81353d324f673acfc0` |
| scope_manifest_sha | `4c6a90dd7364fff58926e99c560a016385cd74c542b1a203fb0b4c6095adaea4` |
| chain_genesis | `GENESIS` |
| hash_function | sha256_raw(prev_hash + ":" + sha256_norm) |

## Chain Policy

- sha256_norm used for all chain entries (R4, R5)
- ASCII lexicographic path ordering (R11)
- Each receipt: chain_hash(N) = sha256_raw(chain_hash(N-1) + ":" + sha256_norm(N))
- Break detection: any receipt modification invalidates downstream chain hashes

## Receipt Chain

| Position | Path | sha256_norm (prefix) | chain_hash (prefix) |
|----------|------|---------------------|---------------------|
| 0 | `EDGE_LAB/ATTEMPT_LEDGER_POLICY.md` | `1f1334d42190915e…` | `d225de133f7a7628…` |
| 1 | `EDGE_LAB/COURT_MANIFEST.md` | `6413adbce60c222f…` | `1fad97e972e2ea5a…` |
| 2 | `EDGE_LAB/DATASET_CONTRACT.md` | `d58e82f882583db6…` | `28f0f4360db40976…` |
| 3 | `EDGE_LAB/DATA_CONFIRM_POLICY.md` | `0dc429f5041c5976…` | `b991e8755b25f241…` |
| 4 | `EDGE_LAB/DELTA_CALC_SPEC.md` | `361437d67d4926ea…` | `91db3f347ddfb398…` |
| 5 | `EDGE_LAB/ERROR_BUDGET_POLICY.md` | `fbd5cc865ac70276…` | `04a72388ab9cf630…` |
| 6 | `EDGE_LAB/EVIDENCE_CANON_RULES.md` | `021ba0511726a903…` | `3befa05288fe561c…` |
| 7 | `EDGE_LAB/EVIDENCE_INDEX.md` | `d11a7e3217cd02a5…` | `c5bdeee8f4accd5b…` |
| 8 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `bce3f67c463e2c5e…` |
| 9 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `e5634eec30601167…` |
| 10 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `208b9b5651c278bc…` |
| 11 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `045177142b960613…` |
| 12 | `EDGE_LAB/FINAL_VERDICT.md` | `f1d3ccc8ae4fa54e…` | `8306cafd3f9841b2…` |
| 13 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `60858af61fe7b157…` |
| 14 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `fdbd426510b1d895…` |
| 15 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `20bca5d8e8fb8cb4…` |
| 16 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `4b8d5d694dc2c11b…` |
| 17 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `ad152b5e56072711…` |
| 18 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `5a4d3e5fe6e7ee4a…` |
| 19 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `155053ecb6d0844b…` |
| 20 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `473a8b1a810552f1…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `02e933865fd66896…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `735be6d9f9d52f67…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `5e550591db9b561e…` |
| 24 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `7ecb0d6a0fc77867…` |
| 25 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `0ffc621b64718b33…` |
| 26 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `15d23ff17d54fbac…` |
| 27 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `c7caa826807e0b4c…` |
| 28 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `73cb9c24ce4b66a9…` |
| 29 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `0cdfea1f5a36c00b…` |
| 30 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `df65877a73841ff2…` |
| 31 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `73fe5fb61629f564…` |
| 32 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `f4c4a672af4d9c84…` | `0b34166220569626…` |
| 33 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `bfc4e0f159ae2353…` |
| 34 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `52d4ee874bd51a24…` |
| 35 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `c878b67888a347cf…` |
| 36 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `8535fc03108b76fc…` |
| 37 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `33d1b38ff7c5a65b…` |
| 38 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `628bfb6f4f7d7119…` |
| 39 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `eac0dc9bbd952096…` |
| 40 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `e42c9c303ad86b74…` |
| 41 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `73ae12e6eabd0a58…` |
| 42 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `265090c7c309ba6e…` |
| 43 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `1cf8fefbac4a7b68…` |
| 44 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `d550ba0964d61da9…` |
| 45 | `reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md` | `c3c2e92f0dc34235…` | `3e608cfd1b5ea90f…` |
| 46 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `addc7e8e105962b6…` | `ff3bcc308525ae32…` |
| 47 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `14668a112229138a…` | `aa3a43fa4bbd24da…` |
| 48 | `reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md` | `cafb2cfb1ca3450f…` | `5a1952921fa88f65…` |
| 49 | `reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json` | `3b082c78cc6a59fd…` | `a7e92debc8c7ccfc…` |
| 50 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `1f0f634082e736e7…` | `779a5cde21113c04…` |
| 51 | `reports/evidence/EDGE_LAB/gates/manual/ledger_acyclicity.json` | `027b4eb243b17137…` | `722b66c09f7906a5…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `678b67a775c46b1f…` | `b5b041b711155050…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `20b15e431d0ac7fb…` | `9dd96dfd4def4e24…` |
| 54 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `e82ad504b25ae7f9…` |
| 55 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `ec161822be5c12dd…` |
| 56 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `10ee2e0d38e23c87…` |
| 57 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `4d832b679a95df21…` |
| 58 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `2b67130036c8128f…` | `fdfb4b917e6515cd…` |
| 59 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `d15e6c00624cb0a3…` |
| 60 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `e4ee2c137e350080…` |
| 61 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `f4f914d5ce5e0739…` |
| 62 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `639c01c7cec03c65…` | `5ed28cb853ecbed4…` |
| 63 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `1d275dbb6fd679e6…` |
| 64 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `78c1c0b8d6205587…` |
| 65 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `65fbb7815e7a058a…` |
| 66 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `89a0874cb32e7d83…` |
| 67 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `45aabe7b02b3d093…` |
| 68 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `1ce3caab6f602de2…` | `ff4f1a006be3866b…` |
| 69 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `40a298771b42c752…` |
| 70 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `4e7a94432e0c1759…` |
| 71 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `43f53afad1123e72…` |
| 72 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `4c7bfeeea63fc048…` |
| 73 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `8ff8930f81976dd2…` |
| 74 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `e1bb72089f800b57…` |
| 75 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `814d1985f1788212…` |
| 76 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `dea92fa2f6577ed5…` |
| 77 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `c3136039ea133e70…` |
| 78 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `c79a8dbef8f32345…` |
| 79 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `3c1451d7b0a1dc3d…` |
| 80 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `71f808c5dfbeed3c…` |
| 81 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `5c8a4453da538813…` |
| 82 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `1d2d8633f39710e2…` |
| 83 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `a74f26aadf14797f…` |
| 84 | `scripts/edge/edge_lab/edge_verdict.mjs` | `6889138dab6c0f57…` | `38210723eb79dfa5…` |
| 85 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `fc3d2f8fdc5e9d36…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
