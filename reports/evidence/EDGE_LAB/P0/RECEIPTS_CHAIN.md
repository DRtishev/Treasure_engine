# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 312268916f58
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 115 |
| final_chain_hash | `dc0b0e2af37ee6a26a510f330b03ec5c048009afdef582cb7184d64873b00728` |
| scope_manifest_sha | `a202ce963b6330f554b6f387cb0151e60d81af24a699ae9f2c2499a978a4040f` |
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
| 4 | `EDGE_LAB/DELTA_CALC_SPEC.md` | `875dc47af399cd06…` | `f14b0a58dd2b64d9…` |
| 5 | `EDGE_LAB/DEP_POLICY.md` | `857c544a6609997b…` | `d18c7f7c2c07513e…` |
| 6 | `EDGE_LAB/ERROR_BUDGET_POLICY.md` | `fbd5cc865ac70276…` | `d7f3e9b35615f42d…` |
| 7 | `EDGE_LAB/EVIDENCE_CANON_RULES.md` | `021ba0511726a903…` | `f5a9977e2032e1e3…` |
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `3bee6a4722a1ba56…` | `f7794add762957a9…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `6084c53f87bda608…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `3e2559b511c17d99…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `72c72902e9a98d8f…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `1883b0f91524e43f…` |
| 13 | `EDGE_LAB/EXPECTANCY_POLICY.md` | `c7a45d923b14dc19…` | `0abee8edc614f4c3…` |
| 14 | `EDGE_LAB/FINAL_VERDICT.md` | `b2e1fa479794a2d8…` | `e795e45e5e2f46b3…` |
| 15 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `845c50983c23a965…` |
| 16 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `033b0ac0e9be3b18…` |
| 17 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `06170e2cadd6ed0e…` |
| 18 | `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `ceda190573d8016d…` | `f7ef25cab6d24ce4…` |
| 19 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `7620c705046fb852…` |
| 20 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `bcf0979f90e33145…` |
| 21 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `0c8115aff431541a…` |
| 22 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `bd05c914a1f8cc02…` |
| 23 | `EDGE_LAB/OVERFIT_POLICY.md` | `c3ed08d18fc63e6e…` | `6f66cd54120ab1c6…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `c9533a5e6e94ad27…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `48fe414ed22566b3…` |
| 26 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `65d7559f4a40e06c…` |
| 27 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA.md` | `f73490a9bf2e342b…` | `bf161ae2797f8f0b…` |
| 28 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `051e15fe3d04c9f9…` |
| 29 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `d32b64ea652b5093…` |
| 30 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `75be44e77e9175ee…` |
| 31 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `ee582b32ca6df56a…` |
| 32 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `101731deffbf6ad2…` |
| 33 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `9c4f8f8ec30264ff…` |
| 34 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `75979852256e2e1e…` |
| 35 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `b9c1422ad77ad869…` |
| 36 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `f55bddfc6f1e37f3…` |
| 37 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `500f364d8adc78b3…` |
| 38 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `94c161d64f8353b1…` |
| 39 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `f85c3303ea7f9ccf…` |
| 40 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `bf41a4122cf91247…` |
| 41 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `064c0275903d3191…` |
| 42 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `49f718c8e036db42…` |
| 43 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `2b901bccae60c484…` |
| 44 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `010697f36c25c956…` |
| 45 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `29a2f1929a195a89…` |
| 46 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `923e8cfaeafa3045…` |
| 47 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `18ba71c86239e563…` |
| 48 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `0daea91909373ebf…` |
| 49 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `cc723b10261a0025…` |
| 50 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `9cd0e6c5348aec89…` |
| 51 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `c42f8a9ea21ed07d…` |
| 52 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `bf4e5d52a21452a6…` | `d82535853b8ea9ce…` |
| 53 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `3c12e42d4daa2bf4…` | `899fb933a84afb38…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `2b1cbbe1420e958a…` | `e82f80356167e1be…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `ed28251ce3429457…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `62ee611d7dcf6912…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `e6fdcb80f5f03ee2…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `61f795a70a66a206…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `ecf865986a11231e…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `67d620eae5317642…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `d9ea1afcabd1760d…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `d956ea0766c676f2…` |
| 63 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `1f2aabb5c0b47f8e…` |
| 64 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `656bb80c106f7272…` |
| 65 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `86a8f0bafe3c99a5…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `3c7217fbdb863196…` |
| 67 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `afdd94aaca2a0351…` |
| 68 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `7cacaab579ae7abf…` |
| 69 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `6c4a7c7d5cbe0378…` |
| 70 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `4ddd1257227b604e…` |
| 71 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `da3a5483e55da617…` |
| 72 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `006b0731e6fe58cd…` |
| 73 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `a5666b59eede9d27…` |
| 74 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `d73d282d1fe59a0a…` |
| 75 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `96c765817d9a878a…` |
| 76 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `d8b1e4e1612a79b4…` |
| 77 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `9f6d8b0a8cbe650f…` |
| 78 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `27051555ae5c9fd2…` |
| 79 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `964fefe39eb47aba…` |
| 80 | `scripts/edge/edge_lab/edge_execution_reality_court.mjs` | `29cda45d2808c601…` | `f31a2ab8aa7f5d4c…` |
| 81 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `0aa412a833ed50ed…` |
| 82 | `scripts/edge/edge_lab/edge_expectancy_court.mjs` | `99afd7af03668332…` | `36f487e948b78394…` |
| 83 | `scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs` | `f92524173b85553a…` | `5834f133a2229340…` |
| 84 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `aa32f7fa64ed8f35…` |
| 85 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `8b4a344b19ab1871…` |
| 86 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `be3de9ff7998fbe4…` |
| 87 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `65e9f45009c8350f…` |
| 88 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `19b8bf163353ba43…` |
| 89 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `cd50489a71ac3746…` |
| 90 | `scripts/edge/edge_lab/edge_overfit_court_mvp.mjs` | `8bb441b6040ceef9…` | `506fb6922f69b51f…` |
| 91 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `ec1094dcc7972acc…` |
| 92 | `scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs` | `196646e0b578f0a3…` | `51be9aba0de4eb61…` |
| 93 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `001c20fd5a7093da…` |
| 94 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `54ac06a09e4c7b8a…` |
| 95 | `scripts/edge/edge_lab/edge_profit_00_closeout.mjs` | `d28b1af257b27389…` | `e59486e8228d597f…` |
| 96 | `scripts/edge/edge_lab/edge_profit_00_doctor.mjs` | `7c083a6c990889f5…` | `551dcdf2ab5827a8…` |
| 97 | `scripts/edge/edge_lab/edge_profit_00_expect_blocked_conflict.mjs` | `1da46caf8a44a866…` | `82bf8c7270410d7c…` |
| 98 | `scripts/edge/edge_lab/edge_profit_00_paths.mjs` | `5993bbb60fe2d6c7…` | `956326629a980cb1…` |
| 99 | `scripts/edge/edge_lab/edge_profit_00_x2.mjs` | `637405f3b3dfe709…` | `08fc32c56af0a90e…` |
| 100 | `scripts/edge/edge_lab/edge_profit_01_super.mjs` | `b23a50af2f8b152a…` | `088604351e426414…` |
| 101 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `4013ed5a4f6e0277…` |
| 102 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `da5843663f57f78e…` |
| 103 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `d59f05410d318e51…` |
| 104 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `150b15757a12e08a…` |
| 105 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `d0923de608d2123e…` |
| 106 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `d3240cfb4d5e150c…` |
| 107 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `a8269a226267cbdf…` |
| 108 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `e2605d1c87e0c4d1…` |
| 109 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `314232c344017ed0…` |
| 110 | `scripts/edge/edge_lab/edge_walk_forward_lite.mjs` | `902ec6a161cccb1b…` | `9cc55a41a54969b8…` |
| 111 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `b6dadabe30258793…` |
| 112 | `scripts/edge/edge_lab/paper_telemetry_import_csv.mjs` | `02e43b66388dfa52…` | `41bbb6db60cccb92…` |
| 113 | `scripts/edge/edge_lab/paper_telemetry_real_stub_gen.mjs` | `f93a3f04672505f6…` | `a320306699dce8d1…` |
| 114 | `scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs` | `dec02f9e858a7b27…` | `dc0b0e2af37ee6a2…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
