# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 4d08f3b36857
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 137 |
| final_chain_hash | `9297a3090e761014a25391eff4a449d535b5b00214b3ff8d1b54ce96b91f93f7` |
| scope_manifest_sha | `540af2030b171b57e3cee3027c8c63c957122fa8458aa2a4c5a55cb0ef3e389f` |
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
| 10 | `EDGE_LAB/EVIDENCE_INDEX.md` | `38dc6c90e1bd8485…` | `f872aade9ab139c9…` |
| 11 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `52db40ee888132fa…` |
| 12 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `a030545ab7e4df9e…` |
| 13 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `561c2ab64f6d982a…` |
| 14 | `EDGE_LAB/EXECUTOR_ENTRYPOINT_DOCTRINE.md` | `b7c2ce5051762b3b…` | `352314885b2e8a2f…` |
| 15 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `799772dd8cda35c8…` |
| 16 | `EDGE_LAB/EXPECTANCY_POLICY.md` | `c7a45d923b14dc19…` | `4f44f279acb5b776…` |
| 17 | `EDGE_LAB/FINAL_VERDICT.md` | `e6079583b67401a5…` | `03a4f4fd81e5608b…` |
| 18 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `657d9e940b96654a…` |
| 19 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `005273c746ffa4c0…` |
| 20 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `8b118c1fdc05b7b9…` |
| 21 | `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `ceda190573d8016d…` | `267d6aa44257bf59…` |
| 22 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `8d5ad7e0e63a3f0d…` |
| 23 | `EDGE_LAB/LIQUIDATIONS_INTELLIGENCE_ROUTE.md` | `3826ef2bd267ce0f…` | `5723e792b4400736…` |
| 24 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `bb84260b70d14623…` |
| 25 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `f4d6226444456d44…` |
| 26 | `EDGE_LAB/OPERATOR_SINGLE_ACTION.md` | `e8ce20889d3d3302…` | `93e79d27f3ea8ec0…` |
| 27 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `895725c7dfad3603…` |
| 28 | `EDGE_LAB/OVERFIT_POLICY.md` | `c3ed08d18fc63e6e…` | `c76245cdfb771a66…` |
| 29 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `a91e9e01683451c9…` |
| 30 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `24db9d983ad0c23c…` |
| 31 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `184fc44706381be6…` |
| 32 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA.md` | `f73490a9bf2e342b…` | `600770ee594325da…` |
| 33 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `a12cbd4712302de8…` |
| 34 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `fef13c80cd6847df…` |
| 35 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `68f08388dc84297a…` |
| 36 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `e0c19e7d51dee022…` |
| 37 | `EDGE_LAB/PORTABLE_PROOF_PACK.md` | `de2f23bf0061566c…` | `1fbf4bac892d0e2e…` |
| 38 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `a4debc0a7ccaa9d9…` |
| 39 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `8722a7f06ee101aa…` |
| 40 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `7cca2a8404711ddd…` |
| 41 | `EDGE_LAB/PROFIT_FOUNDATION_FREEZE.md` | `2d55be7803dc10ed…` | `eab3799590b8d295…` |
| 42 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `d13f6a4a99666f63…` |
| 43 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `f33076fa53f08526…` |
| 44 | `EDGE_LAB/PUBLIC_DATA_READINESS.md` | `f1d1e08939ef145b…` | `d51ac1ccaaa2e3a3…` |
| 45 | `EDGE_LAB/REAL_PUBLIC_EVIDENCE_POLICY.md` | `fd65d4cd144b2724…` | `2757c49d678decee…` |
| 46 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `26071727b56d02e0…` |
| 47 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `ce0de344bc6049ce…` |
| 48 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `9996f1c846261992…` |
| 49 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `79bee026a8c0f123…` |
| 50 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `6908a848b300f060…` |
| 51 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `ccb95ae37f5bb0e0…` |
| 52 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `4910ffd272925e8f…` |
| 53 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `e1a91a43be0ed447…` |
| 54 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `d655650b9757fe63…` |
| 55 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `7305e47d0353364a…` |
| 56 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `0657f1525b7883e3…` |
| 57 | `EDGE_LAB/TRUTH_SEPARATION.md` | `a248eeec7f116e9d…` | `57426756a7359aef…` |
| 58 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `07a27a040f98cad1…` |
| 59 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `8a7e8b841c8c8d0b…` |
| 60 | `EDGE_LAB/VICTORY_SEAL.md` | `81be796b26762c25…` | `599e6ef6976d8cb2…` |
| 61 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `bb0ad52a2113e683…` |
| 62 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `f08df703dc03cbe8…` |
| 63 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `0c883e242236ee2c…` | `d392b5531a923d6b…` |
| 64 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `4a1144994d425b16…` | `ca9e1fbaee0117cf…` |
| 65 | `reports/evidence/EDGE_LAB/P0/VICTORY_EPOCH_CLOSEOUT.md` | `fe15bc84c701f657…` | `2fc09a51428cb967…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `6cad10bd59c09973…` | `2dd2a6980fe36a05…` |
| 67 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `372aaedd4ce1b223…` |
| 68 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `5b29ded30b407955…` |
| 69 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `cfdaf3c3d7a109b5…` |
| 70 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `6b9ad7330f4707c6…` |
| 71 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `4a7d4df8a8c25bfd…` |
| 72 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `236c96202bf57e74…` |
| 73 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `6716421454fcd499…` |
| 74 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `54067be8ef7b1ac8…` |
| 75 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `81007b0e254e279b…` |
| 76 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `84347160e8dd1e2c…` |
| 77 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `9cc5237333702fb9…` |
| 78 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `ae687061fe874308…` |
| 79 | `scripts/edge/edge_lab/canon.mjs` | `8baf3e36b25265ff…` | `be717f9d320d1fe5…` |
| 80 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `868c0839f9c72887…` |
| 81 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `8c81ebd3898dea4b…` |
| 82 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `1995deb7a6b75dbe…` |
| 83 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `1504f83a46295a4a…` |
| 84 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `f0f1f1a5c3122a4b…` |
| 85 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `2a4ed8fab4379547…` |
| 86 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `96c7304193c0b552…` |
| 87 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `580203cd92277825…` |
| 88 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `95205c58f2bc9c38…` |
| 89 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `e704dc81dde93872…` |
| 90 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `22fb06d32e4d53ec…` |
| 91 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `78be561008171ab9…` |
| 92 | `scripts/edge/edge_lab/edge_execution_reality_court.mjs` | `29cda45d2808c601…` | `0195d93a22c2fdde…` |
| 93 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `20b62a36b02aca25…` |
| 94 | `scripts/edge/edge_lab/edge_expectancy_court.mjs` | `99afd7af03668332…` | `8a37b8e0257d564e…` |
| 95 | `scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs` | `f92524173b85553a…` | `3bbefd96e462a57f…` |
| 96 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `34073f97a09f1510…` |
| 97 | `scripts/edge/edge_lab/edge_liq_00_acquire_bybit.mjs` | `35d6c64afe21175c…` | `fc722f6817501f42…` |
| 98 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `851ab25a7726acd1…` |
| 99 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `bbff222488f38de9…` |
| 100 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `f74a12229584067a…` |
| 101 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `e33c285b5a1528a6…` |
| 102 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `b7bf5735c9d266a2…` |
| 103 | `scripts/edge/edge_lab/edge_overfit_court_mvp.mjs` | `8bb441b6040ceef9…` | `8e4469a1db29f0bd…` |
| 104 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `28d0cefda35d496b…` |
| 105 | `scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs` | `48ac74d0568be9f8…` | `d07d905b01b1e1fd…` |
| 106 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `c45c1599768df6b8…` |
| 107 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `68c52fa4739a6f3d…` |
| 108 | `scripts/edge/edge_lab/edge_profit_00_acquire_public_diag.mjs` | `0ed2b9c77a154d25…` | `ece8d6bb97d43001…` |
| 109 | `scripts/edge/edge_lab/edge_profit_00_acquire_public_smoke.mjs` | `34ada8f1cdebd8b3…` | `2624a09f9fb49baa…` |
| 110 | `scripts/edge/edge_lab/edge_profit_00_acquire_real_public.mjs` | `14bd5a8add0f8fd0…` | `09d1cb2fe74487dc…` |
| 111 | `scripts/edge/edge_lab/edge_profit_00_closeout.mjs` | `7217bfcff9f5c0d1…` | `501c0bc7c0e22727…` |
| 112 | `scripts/edge/edge_lab/edge_profit_00_doctor.mjs` | `225d0fd8d29c2b4f…` | `9e42ad913f697216…` |
| 113 | `scripts/edge/edge_lab/edge_profit_00_expect_blocked_conflict.mjs` | `1da46caf8a44a866…` | `b994f6c88a6dc77a…` |
| 114 | `scripts/edge/edge_lab/edge_profit_00_paths.mjs` | `0ac61fd31658db66…` | `2d456bb12e9eec35…` |
| 115 | `scripts/edge/edge_lab/edge_profit_00_x2.mjs` | `637405f3b3dfe709…` | `34bf49453c8f7089…` |
| 116 | `scripts/edge/edge_lab/edge_profit_01_super.mjs` | `b23a50af2f8b152a…` | `2969bcce3e5dc431…` |
| 117 | `scripts/edge/edge_lab/edge_profit_02_expectancy_proof.mjs` | `8119cf9d6a9f52ec…` | `11c3cd7e88860302…` |
| 118 | `scripts/edge/edge_lab/edge_profit_02_pbo_cpcv.mjs` | `2314d1c387bd692d…` | `618eb65840c5b6da…` |
| 119 | `scripts/edge/edge_lab/edge_profit_02_proof_index.mjs` | `8fce04d720e5c9b4…` | `455a40e7c96a05cb…` |
| 120 | `scripts/edge/edge_lab/edge_profit_02_risk_mcdd.mjs` | `1a3e77d3f878c486…` | `e95921e143e608ba…` |
| 121 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `1a955f25333bbf34…` |
| 122 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `22da8969e1f90d67…` |
| 123 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `c1cecdc2a2e16ff4…` |
| 124 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `2b2d87ec77c1ddf8…` |
| 125 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `d8ea0917a5593672…` |
| 126 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `98baebb5b17df907…` |
| 127 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `53da2741414c7a29…` |
| 128 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `12702fd1fbbaeea7…` |
| 129 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `8832e7bad4ac61ce…` |
| 130 | `scripts/edge/edge_lab/edge_walk_forward_lite.mjs` | `902ec6a161cccb1b…` | `18ba603e56ed308f…` |
| 131 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `ac8604ab00e83201…` |
| 132 | `scripts/edge/edge_lab/paper_telemetry_import_csv.mjs` | `2f4cdceb8abf9ae4…` | `a066ae77b21e40ad…` |
| 133 | `scripts/edge/edge_lab/paper_telemetry_real_drop_unpack.mjs` | `1333ca88eeab386d…` | `fc5b5bb37058d706…` |
| 134 | `scripts/edge/edge_lab/paper_telemetry_real_sandbox_gen.mjs` | `54ffe8410b37ed54…` | `e31c730bb1b6c309…` |
| 135 | `scripts/edge/edge_lab/paper_telemetry_real_stub_gen.mjs` | `a3e150170e7e5e2b…` | `65886676dfdf9e07…` |
| 136 | `scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs` | `dec02f9e858a7b27…` | `9297a3090e761014…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
