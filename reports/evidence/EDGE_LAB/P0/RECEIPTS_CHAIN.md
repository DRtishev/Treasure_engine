# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: a0e3806a2bb8
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 136 |
| final_chain_hash | `30fb1ffa9950f5c8f7828aaf2d6ef14bc7d6a0b106169620ca4f963a688ce279` |
| scope_manifest_sha | `a271146caebc16bc645344cb29f469f9d44d2dfeb5a01787acd61c410efed269` |
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
| 3 | `EDGE_LAB/DATA_AUTHORITY_MODEL.md` | `7c13ca4ed34a9e75…` | `75ef3d5adbcde1d0…` |
| 4 | `EDGE_LAB/DATA_CONFIRM_POLICY.md` | `0dc429f5041c5976…` | `a02f66ea46fb98e4…` |
| 5 | `EDGE_LAB/DELTA_CALC_SPEC.md` | `875dc47af399cd06…` | `f96d9df35422d653…` |
| 6 | `EDGE_LAB/DEP_POLICY.md` | `857c544a6609997b…` | `28470674f87bf428…` |
| 7 | `EDGE_LAB/ERROR_BUDGET_POLICY.md` | `fbd5cc865ac70276…` | `3ae48325f8453adf…` |
| 8 | `EDGE_LAB/EVIDENCE_BUNDLE_CONTRACT.md` | `f47e9180723817b6…` | `09ae9837aad15113…` |
| 9 | `EDGE_LAB/EVIDENCE_CANON_RULES.md` | `021ba0511726a903…` | `731ea21dcb40ecd3…` |
| 10 | `EDGE_LAB/EVIDENCE_INDEX.md` | `3066e8a18b50413e…` | `d79694dfb30dfa07…` |
| 11 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `9a108c764e36b400…` |
| 12 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `06b294e03a03490e…` |
| 13 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `3c72ffaaeabf8783…` |
| 14 | `EDGE_LAB/EXECUTOR_ENTRYPOINT_DOCTRINE.md` | `b7c2ce5051762b3b…` | `b67bd59292388437…` |
| 15 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `b235937b8c2fdd8a…` |
| 16 | `EDGE_LAB/EXPECTANCY_POLICY.md` | `c7a45d923b14dc19…` | `7f00faa9a8a5cf95…` |
| 17 | `EDGE_LAB/FINAL_VERDICT.md` | `d6ba264ef82c0edc…` | `bd363414ec9093f8…` |
| 18 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `b12fd87224c943ec…` |
| 19 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `27ecc9157296465d…` |
| 20 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `2c2ae1adafbacc4c…` |
| 21 | `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `ceda190573d8016d…` | `8944864808267b2f…` |
| 22 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `4402d3d3d0319e6b…` |
| 23 | `EDGE_LAB/LIQUIDATIONS_INTELLIGENCE_ROUTE.md` | `70bf505305478891…` | `cb0725f91c5e39ef…` |
| 24 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `ec8e5839c57ff203…` |
| 25 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `228414f5e8649eb4…` |
| 26 | `EDGE_LAB/OPERATOR_SINGLE_ACTION.md` | `5a13c61f981884e0…` | `123dc6888a080293…` |
| 27 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `bf71fe0fefdcdb94…` |
| 28 | `EDGE_LAB/OVERFIT_POLICY.md` | `c3ed08d18fc63e6e…` | `7e2873b4d68cc76c…` |
| 29 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `8aab0dcce73b97e2…` |
| 30 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `d0565bccfdd9e32b…` |
| 31 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `52972207e9ac970a…` |
| 32 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA.md` | `f73490a9bf2e342b…` | `0e83157a1fc719a4…` |
| 33 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `3142f09a2de4e2f9…` |
| 34 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `1c4bcfb674b60dd8…` |
| 35 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `95e1b8055fd851d2…` |
| 36 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `8e8f8d0e78e9dbf5…` |
| 37 | `EDGE_LAB/PORTABLE_PROOF_PACK.md` | `de2f23bf0061566c…` | `7124c80bd5a01338…` |
| 38 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `185d78b0185cd697…` |
| 39 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `747285015f04c14e…` |
| 40 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `e1aad2eed0e25c25…` |
| 41 | `EDGE_LAB/PROFIT_FOUNDATION_FREEZE.md` | `2d55be7803dc10ed…` | `f4f5a03b2cd62fe0…` |
| 42 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `64e53e18e4cc4ef3…` |
| 43 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `f94b3fcc6ed952bf…` |
| 44 | `EDGE_LAB/PUBLIC_DATA_READINESS.md` | `f1d1e08939ef145b…` | `f7f66924dc280114…` |
| 45 | `EDGE_LAB/REAL_PUBLIC_EVIDENCE_POLICY.md` | `fd65d4cd144b2724…` | `c56e0c35fbad8270…` |
| 46 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `d1201c6d6d941b02…` |
| 47 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `5149d5a0cc9782cc…` |
| 48 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `0066c334a622a0b7…` |
| 49 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `dac5d51cd8a047cc…` |
| 50 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `652532b8dd9bf534…` |
| 51 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `dc90a48c1255516b…` |
| 52 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `de5c73a72966f6f8…` |
| 53 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `554b38315b1937e1…` |
| 54 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `ac855f4eacf9a304…` |
| 55 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `4a187ee30fdb05a8…` |
| 56 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `06438dff7431330a…` |
| 57 | `EDGE_LAB/TRUTH_SEPARATION.md` | `a248eeec7f116e9d…` | `8266b7a93734c3f0…` |
| 58 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `ad9b37ed84c26c47…` |
| 59 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `2d5234bd6c1f9193…` |
| 60 | `EDGE_LAB/VICTORY_SEAL.md` | `3586870eed1f2bf8…` | `d0561580cda2138e…` |
| 61 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `3fbcd876abb51854…` |
| 62 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `d62fb4ad8362025b…` |
| 63 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `cec237a6b2423d4b…` | `dfcb2141f3b8b7d5…` |
| 64 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `070e962ea2a8e42c…` | `1853229a4d67d577…` |
| 65 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `1d4a0cae853bdcdf…` | `b5ba8fdbe23ff162…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `e2e35f672f72b879…` |
| 67 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `4191cb95dc35ea84…` |
| 68 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `a5a2119edd34ec50…` |
| 69 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `921a4eb965b9182d…` |
| 70 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `3da86056df9475e4…` |
| 71 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `d72b5f9e23841c89…` |
| 72 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `b437d8b192c727c6…` |
| 73 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `8775789fbb02b71b…` |
| 74 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `ddf16631fdf44336…` |
| 75 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `4da9a983efecda3b…` |
| 76 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `b5957f31b762efc1…` |
| 77 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `e1876cc3eb39bc56…` |
| 78 | `scripts/edge/edge_lab/canon.mjs` | `3be42ce8fbf36ca6…` | `e6504d5eb362e036…` |
| 79 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `53b4da1b1e8f7b5d…` |
| 80 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `a8aae79c42a69c8a…` |
| 81 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `1eaee6e9afdddb55…` |
| 82 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `21438cad605e10d2…` |
| 83 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `a2fd2179ef13b488…` |
| 84 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `993b2f767eb59493…` |
| 85 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `ba60ae03560d2ae2…` |
| 86 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `5455360a7b7f1cc2…` |
| 87 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `405bb3e0decb628d…` |
| 88 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `f88191772c19bc52…` |
| 89 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `bf02a06c53bdb99d…` |
| 90 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `629185dda37f309b…` |
| 91 | `scripts/edge/edge_lab/edge_execution_reality_court.mjs` | `29cda45d2808c601…` | `5b06edb9c637e157…` |
| 92 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `feb159e45b767c62…` |
| 93 | `scripts/edge/edge_lab/edge_expectancy_court.mjs` | `99afd7af03668332…` | `e12afea8d4762ab6…` |
| 94 | `scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs` | `f92524173b85553a…` | `212369fd09f55885…` |
| 95 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `2d759f6503e57a0f…` |
| 96 | `scripts/edge/edge_lab/edge_liq_00_acquire_bybit.mjs` | `35d6c64afe21175c…` | `0a6b594e56daef6c…` |
| 97 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `89d85273f109d18b…` |
| 98 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `3ddb03544c7ee03f…` |
| 99 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `55cff2c4eb0688bc…` |
| 100 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `ac2b73ef1ee31151…` |
| 101 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `2cb04dae1d98c934…` |
| 102 | `scripts/edge/edge_lab/edge_overfit_court_mvp.mjs` | `8bb441b6040ceef9…` | `2b3c888440a515e0…` |
| 103 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `f417a939e9eedd44…` |
| 104 | `scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs` | `48ac74d0568be9f8…` | `1e034700540e121e…` |
| 105 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `9c98fc568201b003…` |
| 106 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `e51fbceb90ae8420…` |
| 107 | `scripts/edge/edge_lab/edge_profit_00_acquire_public_diag.mjs` | `0ed2b9c77a154d25…` | `bf90afba24e7d495…` |
| 108 | `scripts/edge/edge_lab/edge_profit_00_acquire_public_smoke.mjs` | `34ada8f1cdebd8b3…` | `6734bd250549063b…` |
| 109 | `scripts/edge/edge_lab/edge_profit_00_acquire_real_public.mjs` | `14bd5a8add0f8fd0…` | `f90801e809105c09…` |
| 110 | `scripts/edge/edge_lab/edge_profit_00_closeout.mjs` | `7217bfcff9f5c0d1…` | `8a5e6b33768f71f9…` |
| 111 | `scripts/edge/edge_lab/edge_profit_00_doctor.mjs` | `225d0fd8d29c2b4f…` | `a4688bbf81af7c87…` |
| 112 | `scripts/edge/edge_lab/edge_profit_00_expect_blocked_conflict.mjs` | `1da46caf8a44a866…` | `92dd62c3a0973203…` |
| 113 | `scripts/edge/edge_lab/edge_profit_00_paths.mjs` | `0ac61fd31658db66…` | `795544dd4b780e79…` |
| 114 | `scripts/edge/edge_lab/edge_profit_00_x2.mjs` | `637405f3b3dfe709…` | `e17c857d17122d19…` |
| 115 | `scripts/edge/edge_lab/edge_profit_01_super.mjs` | `b23a50af2f8b152a…` | `55cb7a3ae9d3edd4…` |
| 116 | `scripts/edge/edge_lab/edge_profit_02_expectancy_proof.mjs` | `8119cf9d6a9f52ec…` | `ff1b5f8b461f59c7…` |
| 117 | `scripts/edge/edge_lab/edge_profit_02_pbo_cpcv.mjs` | `2314d1c387bd692d…` | `5518d53f996844a1…` |
| 118 | `scripts/edge/edge_lab/edge_profit_02_proof_index.mjs` | `8fce04d720e5c9b4…` | `4a0a3b3158ae2a65…` |
| 119 | `scripts/edge/edge_lab/edge_profit_02_risk_mcdd.mjs` | `1a3e77d3f878c486…` | `2e8d912d9545acf9…` |
| 120 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `ea900cee1a804510…` |
| 121 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `c3d8cccf974c1486…` |
| 122 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `dedf022dabfd99e4…` |
| 123 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `cfd557aa1f509436…` |
| 124 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `bc2f465c79d26c8d…` |
| 125 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `689fb6e96d62f79f…` |
| 126 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `8495692d26fb19b8…` |
| 127 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `b96c08fb25a57982…` |
| 128 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `b22034b75e65bb0c…` |
| 129 | `scripts/edge/edge_lab/edge_walk_forward_lite.mjs` | `902ec6a161cccb1b…` | `d3352400f26b9be4…` |
| 130 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `79c363a5bff2482c…` |
| 131 | `scripts/edge/edge_lab/paper_telemetry_import_csv.mjs` | `2f4cdceb8abf9ae4…` | `c99dab2ba4a776e5…` |
| 132 | `scripts/edge/edge_lab/paper_telemetry_real_drop_unpack.mjs` | `1333ca88eeab386d…` | `e2f76a23e169de3e…` |
| 133 | `scripts/edge/edge_lab/paper_telemetry_real_sandbox_gen.mjs` | `54ffe8410b37ed54…` | `a7631cda006e2024…` |
| 134 | `scripts/edge/edge_lab/paper_telemetry_real_stub_gen.mjs` | `a3e150170e7e5e2b…` | `3fe9c1707cd22aae…` |
| 135 | `scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs` | `dec02f9e858a7b27…` | `30fb1ffa9950f5c8…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
