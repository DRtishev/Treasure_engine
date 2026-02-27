# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: aad548e5e739
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 136 |
| final_chain_hash | `202350d163182b1d12f187ee86541e8d7715392095bb275a89703440c07c1e82` |
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
| 10 | `EDGE_LAB/EVIDENCE_INDEX.md` | `26c5657006accd4b…` | `b83c3da6d6349b92…` |
| 11 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `7ccf3372a87d61fd…` |
| 12 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `76bd41f9f566ee51…` |
| 13 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `66d620e53ba74daf…` |
| 14 | `EDGE_LAB/EXECUTOR_ENTRYPOINT_DOCTRINE.md` | `b7c2ce5051762b3b…` | `41616c872694bed1…` |
| 15 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `fc006a40bcf6b62a…` |
| 16 | `EDGE_LAB/EXPECTANCY_POLICY.md` | `c7a45d923b14dc19…` | `df9a870be86387be…` |
| 17 | `EDGE_LAB/FINAL_VERDICT.md` | `8fa4efbf4e06a5f0…` | `2addd802a4053af0…` |
| 18 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `b9dbd7ccaa5b07f1…` |
| 19 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `358e684ba55498ff…` |
| 20 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `d5b264058381a913…` |
| 21 | `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `ceda190573d8016d…` | `9f4bf44ae3562687…` |
| 22 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `3cafc9f217ed081a…` |
| 23 | `EDGE_LAB/LIQUIDATIONS_INTELLIGENCE_ROUTE.md` | `3826ef2bd267ce0f…` | `f1e2b05e1a5e6591…` |
| 24 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `3be82b9f80c44370…` |
| 25 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `9e6029c3d26a4b17…` |
| 26 | `EDGE_LAB/OPERATOR_SINGLE_ACTION.md` | `e8ce20889d3d3302…` | `e91e63d688908dd6…` |
| 27 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `dced35cce88e6062…` |
| 28 | `EDGE_LAB/OVERFIT_POLICY.md` | `c3ed08d18fc63e6e…` | `7ca3bd7c24ea9e34…` |
| 29 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `bf7dd08df261952c…` |
| 30 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `a2e48dae2bfa2a9c…` |
| 31 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `ae74ddca6889c9e0…` |
| 32 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA.md` | `f73490a9bf2e342b…` | `18c3ab0c7d334853…` |
| 33 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `a63a0821697431e7…` |
| 34 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `038d7951ade8773e…` |
| 35 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `8000a57f0e494e40…` |
| 36 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `84570489dd1765d7…` |
| 37 | `EDGE_LAB/PORTABLE_PROOF_PACK.md` | `de2f23bf0061566c…` | `d7ac3b1c4ffc1add…` |
| 38 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `b85fe1e6f4d27db6…` |
| 39 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `06be805b9746e535…` |
| 40 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `a68101d4751d2399…` |
| 41 | `EDGE_LAB/PROFIT_FOUNDATION_FREEZE.md` | `2d55be7803dc10ed…` | `b99eece378b2b1bd…` |
| 42 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `d7a38bd81015e741…` |
| 43 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `7f0726854d21cd9d…` |
| 44 | `EDGE_LAB/PUBLIC_DATA_READINESS.md` | `f1d1e08939ef145b…` | `83d125b8d1883fdc…` |
| 45 | `EDGE_LAB/REAL_PUBLIC_EVIDENCE_POLICY.md` | `fd65d4cd144b2724…` | `150c59e0dc7ec7d8…` |
| 46 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `fd118df1efffe86d…` |
| 47 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `74d9b6ba13289780…` |
| 48 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `b9359c03f7c5e355…` |
| 49 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `c391156296b689fc…` |
| 50 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `59f995c623e66846…` |
| 51 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `ec0b4ebda18a1c53…` |
| 52 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `d535c61db8839302…` |
| 53 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `003f9aaab83d59ef…` |
| 54 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `8bb8101fa0c01a95…` |
| 55 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `0829de14ad280590…` |
| 56 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `04c9fbfccd0eef43…` |
| 57 | `EDGE_LAB/TRUTH_SEPARATION.md` | `a248eeec7f116e9d…` | `e46c17acf3e538c5…` |
| 58 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `9a22fe005c6cfc31…` |
| 59 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `5f1d8fc55d9c4e75…` |
| 60 | `EDGE_LAB/VICTORY_SEAL.md` | `81be796b26762c25…` | `4e075a68aa2b7ef4…` |
| 61 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `6a894809d0a24e78…` |
| 62 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `8cb4b2ff3ef426d5…` |
| 63 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `e8dbf39b4a78ebe3…` | `6c76ee205ac58ca2…` |
| 64 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `dcb4b043b9f42859…` | `85b5bc2d7cfdfd1a…` |
| 65 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `3951cc20495457fa…` | `2a8c487708238de0…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `a3bbd9bb66576736…` |
| 67 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `42dea538e650eb86…` |
| 68 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `3ad1318431f2bd28…` |
| 69 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `1d192bd298ad36d4…` |
| 70 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `0834e236d910e6c4…` |
| 71 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `045875249ea8a825…` |
| 72 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `1eccca5a756fb126…` |
| 73 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `e7609a94b498e61c…` |
| 74 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `f524f8b253d976ea…` |
| 75 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `822c0c97b47dcd70…` |
| 76 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `5e4294b8cb82a818…` |
| 77 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `747089b4ba71b3e3…` |
| 78 | `scripts/edge/edge_lab/canon.mjs` | `8baf3e36b25265ff…` | `0c735b2df1d903ce…` |
| 79 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `352f2d020a22b6d2…` |
| 80 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `6906e5a346fdda52…` |
| 81 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `8a7cd04df811a65c…` |
| 82 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `7e270f8c8ab5da3d…` |
| 83 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `006c354ba91ec711…` |
| 84 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `3e4d7c0d57b76dd5…` |
| 85 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `83e3ac8d1f0b5c43…` |
| 86 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `f0b1d37794f0fbeb…` |
| 87 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `9d5900728876a278…` |
| 88 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `1a61b4c9dbb9b699…` |
| 89 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `e7fdf6cd04ddb04d…` |
| 90 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `4d32b16179fe062b…` |
| 91 | `scripts/edge/edge_lab/edge_execution_reality_court.mjs` | `29cda45d2808c601…` | `5163afa59dc6756e…` |
| 92 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `ec8b84429873430b…` |
| 93 | `scripts/edge/edge_lab/edge_expectancy_court.mjs` | `99afd7af03668332…` | `2af2070c1f0ed3dd…` |
| 94 | `scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs` | `f92524173b85553a…` | `ec58500245ccdcae…` |
| 95 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `9e65cad814e5152d…` |
| 96 | `scripts/edge/edge_lab/edge_liq_00_acquire_bybit.mjs` | `35d6c64afe21175c…` | `1dde9034d0f693e6…` |
| 97 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `1f3f9a9ecc11b58e…` |
| 98 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `ca959d3f83db8191…` |
| 99 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `6b3930ad90a3ab37…` |
| 100 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `105e9b9c2bf2c774…` |
| 101 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `b7be8347e3e4e908…` |
| 102 | `scripts/edge/edge_lab/edge_overfit_court_mvp.mjs` | `8bb441b6040ceef9…` | `132328615bf95f66…` |
| 103 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `a3b95a58f7ed335e…` |
| 104 | `scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs` | `48ac74d0568be9f8…` | `1c895e4608756ef9…` |
| 105 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `488816e8d0a66d75…` |
| 106 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `6c85781087c35509…` |
| 107 | `scripts/edge/edge_lab/edge_profit_00_acquire_public_diag.mjs` | `0ed2b9c77a154d25…` | `1a65e4af63e7f41a…` |
| 108 | `scripts/edge/edge_lab/edge_profit_00_acquire_public_smoke.mjs` | `34ada8f1cdebd8b3…` | `f9a3ce21266ec3db…` |
| 109 | `scripts/edge/edge_lab/edge_profit_00_acquire_real_public.mjs` | `14bd5a8add0f8fd0…` | `e8c0896de9ea47cc…` |
| 110 | `scripts/edge/edge_lab/edge_profit_00_closeout.mjs` | `7217bfcff9f5c0d1…` | `91b719527723fded…` |
| 111 | `scripts/edge/edge_lab/edge_profit_00_doctor.mjs` | `225d0fd8d29c2b4f…` | `034a80305608e037…` |
| 112 | `scripts/edge/edge_lab/edge_profit_00_expect_blocked_conflict.mjs` | `1da46caf8a44a866…` | `8abdb88f4a18584f…` |
| 113 | `scripts/edge/edge_lab/edge_profit_00_paths.mjs` | `0ac61fd31658db66…` | `5666480d46beb11a…` |
| 114 | `scripts/edge/edge_lab/edge_profit_00_x2.mjs` | `637405f3b3dfe709…` | `8da7b49cc98b0534…` |
| 115 | `scripts/edge/edge_lab/edge_profit_01_super.mjs` | `b23a50af2f8b152a…` | `413a5c04c53b86db…` |
| 116 | `scripts/edge/edge_lab/edge_profit_02_expectancy_proof.mjs` | `8119cf9d6a9f52ec…` | `41725494e74f5fe8…` |
| 117 | `scripts/edge/edge_lab/edge_profit_02_pbo_cpcv.mjs` | `2314d1c387bd692d…` | `3c126b71cbee3d74…` |
| 118 | `scripts/edge/edge_lab/edge_profit_02_proof_index.mjs` | `8fce04d720e5c9b4…` | `28976375f5ba2638…` |
| 119 | `scripts/edge/edge_lab/edge_profit_02_risk_mcdd.mjs` | `1a3e77d3f878c486…` | `601b2481534ddcdf…` |
| 120 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `355da2c9ce09c0ca…` |
| 121 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `90b2a8621fc8ec74…` |
| 122 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `2e85a849782f1e73…` |
| 123 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `58619602bfc5fb69…` |
| 124 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `d1735a18c6785039…` |
| 125 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `e1fb42bca883beec…` |
| 126 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `e65d13bc4d13dbe7…` |
| 127 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `9b282f223b219d6b…` |
| 128 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `7e11c3e745f8bd57…` |
| 129 | `scripts/edge/edge_lab/edge_walk_forward_lite.mjs` | `902ec6a161cccb1b…` | `541de914e1721dc8…` |
| 130 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `d746914399ecf261…` |
| 131 | `scripts/edge/edge_lab/paper_telemetry_import_csv.mjs` | `2f4cdceb8abf9ae4…` | `66165702d2dff8f0…` |
| 132 | `scripts/edge/edge_lab/paper_telemetry_real_drop_unpack.mjs` | `1333ca88eeab386d…` | `a1092e33c69e6f99…` |
| 133 | `scripts/edge/edge_lab/paper_telemetry_real_sandbox_gen.mjs` | `54ffe8410b37ed54…` | `12d480ae8d4880e3…` |
| 134 | `scripts/edge/edge_lab/paper_telemetry_real_stub_gen.mjs` | `a3e150170e7e5e2b…` | `fa31eaf61ebd47a2…` |
| 135 | `scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs` | `dec02f9e858a7b27…` | `202350d163182b1d…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
