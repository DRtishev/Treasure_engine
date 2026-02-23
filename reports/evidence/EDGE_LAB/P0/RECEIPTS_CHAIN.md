# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 1e93566551e0
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 121 |
| final_chain_hash | `1a4238190558f1fea25847ca8099a017ba8ff0f0f2695391b616c2d753e7ad5e` |
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
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `85775b0745d8591a…` | `fd1733bff4275b3b…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `a96ad78cdf87d5a7…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `fbfc6c12adb5516f…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `6a4f798dde294dc3…` |
| 12 | `EDGE_LAB/EXECUTOR_ENTRYPOINT_DOCTRINE.md` | `b7c2ce5051762b3b…` | `d4dd349d2e48acdc…` |
| 13 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `8e0c36d473132621…` |
| 14 | `EDGE_LAB/EXPECTANCY_POLICY.md` | `c7a45d923b14dc19…` | `a081cf2855bf3989…` |
| 15 | `EDGE_LAB/FINAL_VERDICT.md` | `677021e9ed48ca44…` | `14b50f06ec37cb94…` |
| 16 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `6260b13431895dff…` |
| 17 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `7e49f9233fd8ebf8…` |
| 18 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `5f8affd8e71c8047…` |
| 19 | `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `ceda190573d8016d…` | `e476634f96e35b81…` |
| 20 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `60ee62cc9dd9fcb3…` |
| 21 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `71972a0576a8f478…` |
| 22 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `b15defef7d5c2639…` |
| 23 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `8ef196753e687caf…` |
| 24 | `EDGE_LAB/OVERFIT_POLICY.md` | `c3ed08d18fc63e6e…` | `9beed5bf4c77d2af…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `aceaab04c223ee88…` |
| 26 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `e78f3125844782bf…` |
| 27 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `cece65a20a3f05a9…` |
| 28 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA.md` | `f73490a9bf2e342b…` | `11e4937c07605c3c…` |
| 29 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `7ce6f259ea6d860b…` |
| 30 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `abd583cd163c71fb…` |
| 31 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `95a4ddeb1617719b…` |
| 32 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `3cd3b302b9cb5dbf…` |
| 33 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `8b10a225fe67658e…` |
| 34 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `e536dfb5bf1fcbaf…` |
| 35 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `7a2091ed2b5b4b47…` |
| 36 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `4f04e2c73405ced1…` |
| 37 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `9e05decb76ca291f…` |
| 38 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `c8d73cc943dfedd1…` |
| 39 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `120c41e2dcd69670…` |
| 40 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `548668e887a20d18…` |
| 41 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `533ccff9202461a1…` |
| 42 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `5da7fde238d65351…` |
| 43 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `376fabb1c031af2c…` |
| 44 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `1ac084d568c41021…` |
| 45 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `70f401672d94b37a…` |
| 46 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `800eda6f853283ff…` |
| 47 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `01c70fe062e0f5ad…` |
| 48 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `fdb90d35c77b61ac…` |
| 49 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `9f51a511e27768ca…` |
| 50 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `2c363bf0113c120a…` |
| 51 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `00bd9d694ec219ca…` |
| 52 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `11ad9cfe2b51b1ea…` |
| 53 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `ff097c79c3ea6c5d…` | `66b4a2da536eb9bb…` |
| 54 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `029d45d7cfb9707e…` | `910a015a8a83e0fc…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `bd0bbcb361418865…` | `ae33b201413ec7b2…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `cd6c2208604960f1…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `6f918fe302ce0781…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `bc2ba95f6ad5bb26…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `7b5a3182fe8bfec7…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `cd95288734e9c503…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `b92de148fc942a6a…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `3070f207cd2a3dae…` |
| 63 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `3df6053ba0c413b9…` |
| 64 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `f593e15d6a073177…` |
| 65 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `357dcaa243fc09fc…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `27ff8d232718491b…` |
| 67 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `23996d9f71edf5d6…` |
| 68 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `c9c12f49e5faa8c7…` |
| 69 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `6f794ae20228fdf1…` |
| 70 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `4e7a34f5c62f9851…` |
| 71 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `33b13120cbb84c2d…` |
| 72 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `5de67379fc20e470…` |
| 73 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `30f1fcf79ddcfa23…` |
| 74 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `b29f36a6e389f396…` |
| 75 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `a8a89b591e587000…` |
| 76 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `a372fe183e71a4e3…` |
| 77 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `670065396da2e5e3…` |
| 78 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `557a371359e72391…` |
| 79 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `fe20a3c3163bfee1…` |
| 80 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `a9b8a30d3bdba7f4…` |
| 81 | `scripts/edge/edge_lab/edge_execution_reality_court.mjs` | `29cda45d2808c601…` | `5dc77d62106f2e25…` |
| 82 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `41c664d744110da2…` |
| 83 | `scripts/edge/edge_lab/edge_expectancy_court.mjs` | `99afd7af03668332…` | `ddec816f0a20e3fb…` |
| 84 | `scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs` | `f92524173b85553a…` | `65b5c72ec13d9cbe…` |
| 85 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `b35a9cb8184c6be3…` |
| 86 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `92d4f0394332243e…` |
| 87 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `cb76ecfce17d7a3c…` |
| 88 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `4e5abac46815719f…` |
| 89 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `896d9def0151e5f9…` |
| 90 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `3b135b9076c803c9…` |
| 91 | `scripts/edge/edge_lab/edge_overfit_court_mvp.mjs` | `8bb441b6040ceef9…` | `e47efff8b4c6fcf2…` |
| 92 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `41a9c71d60993aaf…` |
| 93 | `scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs` | `fc08efa1084047e5…` | `12f52ca936478cbb…` |
| 94 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `634d5d10e137149a…` |
| 95 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `b8a08a8ef965eaeb…` |
| 96 | `scripts/edge/edge_lab/edge_profit_00_closeout.mjs` | `b40dc0fc9242b976…` | `a363d86abacee0ac…` |
| 97 | `scripts/edge/edge_lab/edge_profit_00_doctor.mjs` | `f780fe9e84ac1e8d…` | `adddb62954218b4a…` |
| 98 | `scripts/edge/edge_lab/edge_profit_00_expect_blocked_conflict.mjs` | `1da46caf8a44a866…` | `8300f6f2b3e165fe…` |
| 99 | `scripts/edge/edge_lab/edge_profit_00_paths.mjs` | `5993bbb60fe2d6c7…` | `d2bc332141e919b0…` |
| 100 | `scripts/edge/edge_lab/edge_profit_00_x2.mjs` | `637405f3b3dfe709…` | `a35108ad1f654e4e…` |
| 101 | `scripts/edge/edge_lab/edge_profit_01_super.mjs` | `b23a50af2f8b152a…` | `764bd05e8ce19e51…` |
| 102 | `scripts/edge/edge_lab/edge_profit_02_expectancy_proof.mjs` | `a9eb0e0db101ba05…` | `3996ee20d8fb4110…` |
| 103 | `scripts/edge/edge_lab/edge_profit_02_pbo_cpcv.mjs` | `d23b6db553279a5f…` | `b535b2cf250972fa…` |
| 104 | `scripts/edge/edge_lab/edge_profit_02_proof_index.mjs` | `8da344c45eb179db…` | `4ca58048a6565507…` |
| 105 | `scripts/edge/edge_lab/edge_profit_02_risk_mcdd.mjs` | `3ce2620d05965b88…` | `8fea9efaf03f8970…` |
| 106 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `6569c27d7dc00ab6…` |
| 107 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `b694d7683dc34828…` |
| 108 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `9812d0ed738e65f6…` |
| 109 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `83c753ac4ad675cb…` |
| 110 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `cee4d72663423d95…` |
| 111 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `1df1c8fc27c5201a…` |
| 112 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `99fd957d4c9ec85a…` |
| 113 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `686624a2229de7cb…` |
| 114 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `ece5497537f0da79…` |
| 115 | `scripts/edge/edge_lab/edge_walk_forward_lite.mjs` | `902ec6a161cccb1b…` | `bd2ba294c81d45d9…` |
| 116 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `8e3f48a9ee4b5957…` |
| 117 | `scripts/edge/edge_lab/paper_telemetry_import_csv.mjs` | `c0e733c177d7b15a…` | `8cce79cb997ff4a2…` |
| 118 | `scripts/edge/edge_lab/paper_telemetry_real_sandbox_gen.mjs` | `f867fc3664cb594f…` | `f243cf1b1214bb7f…` |
| 119 | `scripts/edge/edge_lab/paper_telemetry_real_stub_gen.mjs` | `d652183d83a86bdb…` | `06ea0a78703098e3…` |
| 120 | `scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs` | `dec02f9e858a7b27…` | `1a4238190558f1fe…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
