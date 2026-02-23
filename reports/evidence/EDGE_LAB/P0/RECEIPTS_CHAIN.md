# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: a7fda148d63c
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 121 |
| final_chain_hash | `dc88399d107b1d096bfe4007171aee33aa1b73420c352668400604ef9c0fa2cc` |
| scope_manifest_sha | `b58e9929b24f9461d993b38c1c5fab0c8350f955a9b4d11061498b18089cc775` |
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
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `dbe081e543169979…` | `6146040283fa2f63…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `6a1df5ea77ea5180…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `492f7074c5983559…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `32b0844cb965945c…` |
| 12 | `EDGE_LAB/EXECUTOR_ENTRYPOINT_DOCTRINE.md` | `b7c2ce5051762b3b…` | `2f60f58fb493f190…` |
| 13 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `b7015296c21dbb20…` |
| 14 | `EDGE_LAB/EXPECTANCY_POLICY.md` | `c7a45d923b14dc19…` | `61625bea826fb430…` |
| 15 | `EDGE_LAB/FINAL_VERDICT.md` | `a60e36903cc894a8…` | `f6416d97d1ea3e52…` |
| 16 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `316bf4343d3e936f…` |
| 17 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `470cee70d707166d…` |
| 18 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `e5d51a06e2f45eda…` |
| 19 | `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `ceda190573d8016d…` | `e923ac918850b79e…` |
| 20 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `62d0daa2a10088a1…` |
| 21 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `0efd30d2333c0af9…` |
| 22 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `adf8c1764122f2a5…` |
| 23 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `6db7476b82d43bc3…` |
| 24 | `EDGE_LAB/OVERFIT_POLICY.md` | `c3ed08d18fc63e6e…` | `6442262272dc1d83…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `152adb72d9f50179…` |
| 26 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `fe0a44a897ba1428…` |
| 27 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `916e2a400549a088…` |
| 28 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA.md` | `f73490a9bf2e342b…` | `eee5f8ee596d1e31…` |
| 29 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `64793b5371013081…` |
| 30 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `b8230abce0a61f9f…` |
| 31 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `c3cd01885d5577bd…` |
| 32 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `a6ad6a8cac44f7d8…` |
| 33 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `93f32496d6b00ed5…` |
| 34 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `47a332fdf98d1597…` |
| 35 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `9520c58583ae59b6…` |
| 36 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `c3ba170bbc1039fd…` |
| 37 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `0fc8e97feececdf0…` |
| 38 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `65d00ee35cd6f51a…` |
| 39 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `8234ffa8a51ef048…` |
| 40 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `6d9bbc446beecded…` |
| 41 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `0304696d558e4846…` |
| 42 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `aa3035ce03649f38…` |
| 43 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `dc1ca0b1baf0b72c…` |
| 44 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `35646f95e3f78cf6…` |
| 45 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `fbdbfb574c89b68d…` |
| 46 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `20c264984195dec5…` |
| 47 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `98a3c8336e13970b…` |
| 48 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `84bf73df08bf463b…` |
| 49 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `eac847028a4a0591…` |
| 50 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `6043a528f52d8e2e…` |
| 51 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `f72b04f98d29bd81…` |
| 52 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `e0bad5a0822ece57…` |
| 53 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `5c568d7f5115c0c4…` | `843e0cbbdd303823…` |
| 54 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `6ec0ba5359a51da7…` | `79a9503c9da17876…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `854471017f5a2fb3…` | `f9e88ad5e38fe73d…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `ed0ff358c3a720f3…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `7ef711fc05de89be…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `6368bcb0b42de73d…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `73f7f65a011205fc…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `6c21f986fbe31dfa…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `2bd8ebd8b7776727…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `56f861bd0430a337…` |
| 63 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `c51233ef9506db02…` |
| 64 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `5029cfaee1eef975…` |
| 65 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `9fa1641682a5a93b…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `fab0757a8be42104…` |
| 67 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `2d1a7d52288fd347…` |
| 68 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `57ec4646ad2e53c7…` |
| 69 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `e1274d7410d5663f…` |
| 70 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `42280995f303fd82…` |
| 71 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `73ecb5d9e7dc04b3…` |
| 72 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `a0335cba7f78155a…` |
| 73 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `a817b6f3e6f5f164…` |
| 74 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `c10e105a20d918ed…` |
| 75 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `5e9ec872fa532df8…` |
| 76 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `51466d2d7505fb94…` |
| 77 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `337bcc513175e419…` |
| 78 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `03072e2161f7f78f…` |
| 79 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `0b642878cee0c0ad…` |
| 80 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `231fedffb37f80b7…` |
| 81 | `scripts/edge/edge_lab/edge_execution_reality_court.mjs` | `29cda45d2808c601…` | `d9fc5884eb058ff5…` |
| 82 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `dbaf5220a2e2a712…` |
| 83 | `scripts/edge/edge_lab/edge_expectancy_court.mjs` | `99afd7af03668332…` | `f71daef9124536bf…` |
| 84 | `scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs` | `f92524173b85553a…` | `8f520bc67e43a460…` |
| 85 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `e66b47a57a18a081…` |
| 86 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `a3d06899ca966883…` |
| 87 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `133204e18c37fa49…` |
| 88 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `4204e8f32e7c02fe…` |
| 89 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `618b848907dd687f…` |
| 90 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `cdd8a1013dcb53ea…` |
| 91 | `scripts/edge/edge_lab/edge_overfit_court_mvp.mjs` | `8bb441b6040ceef9…` | `b86555a23c8eaaf0…` |
| 92 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `83f3a782acea6e2d…` |
| 93 | `scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs` | `0475d19338f5bdd6…` | `a67444545f9191f9…` |
| 94 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `1d041abb23be7c7c…` |
| 95 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `d33de73766336a76…` |
| 96 | `scripts/edge/edge_lab/edge_profit_00_closeout.mjs` | `b40dc0fc9242b976…` | `4548024090826493…` |
| 97 | `scripts/edge/edge_lab/edge_profit_00_doctor.mjs` | `90b65b33ccbb998c…` | `acbe66c32b2f0753…` |
| 98 | `scripts/edge/edge_lab/edge_profit_00_expect_blocked_conflict.mjs` | `1da46caf8a44a866…` | `91b4ef47707cab26…` |
| 99 | `scripts/edge/edge_lab/edge_profit_00_paths.mjs` | `9ec9ae09d2a65036…` | `a9ef6226ea326b55…` |
| 100 | `scripts/edge/edge_lab/edge_profit_00_x2.mjs` | `637405f3b3dfe709…` | `0f9d70bd3a0d49f6…` |
| 101 | `scripts/edge/edge_lab/edge_profit_01_super.mjs` | `b23a50af2f8b152a…` | `01bd28c13603cbdd…` |
| 102 | `scripts/edge/edge_lab/edge_profit_02_expectancy_proof.mjs` | `be2dce6859396237…` | `a527270eea27ea3c…` |
| 103 | `scripts/edge/edge_lab/edge_profit_02_pbo_cpcv.mjs` | `fe9ceb0ec05f3e56…` | `481de1acc63d2a71…` |
| 104 | `scripts/edge/edge_lab/edge_profit_02_proof_index.mjs` | `8da344c45eb179db…` | `00d6826feb9a7d76…` |
| 105 | `scripts/edge/edge_lab/edge_profit_02_risk_mcdd.mjs` | `c2e7c088c0fe12df…` | `88a6bae0271686df…` |
| 106 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `07f421550f4cb039…` |
| 107 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `91790f20464ad4e9…` |
| 108 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `01afa3838c6fad30…` |
| 109 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `b81dcb0c490bfc61…` |
| 110 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `ef9ecf9b7b80a66c…` |
| 111 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `86b81c9e49182aba…` |
| 112 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `9691616782072e95…` |
| 113 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `54cefa4155bbdb34…` |
| 114 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `b99ec1a9e7f38894…` |
| 115 | `scripts/edge/edge_lab/edge_walk_forward_lite.mjs` | `902ec6a161cccb1b…` | `b7ca7beb6a49b0f6…` |
| 116 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `ec2b1779d4fcd68e…` |
| 117 | `scripts/edge/edge_lab/paper_telemetry_import_csv.mjs` | `4e08ec24947e963e…` | `a0a640ad41a219db…` |
| 118 | `scripts/edge/edge_lab/paper_telemetry_real_sandbox_gen.mjs` | `54ffe8410b37ed54…` | `3bf6046872080722…` |
| 119 | `scripts/edge/edge_lab/paper_telemetry_real_stub_gen.mjs` | `a3e150170e7e5e2b…` | `e1c5eb3141de7a41…` |
| 120 | `scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs` | `dec02f9e858a7b27…` | `dc88399d107b1d09…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
