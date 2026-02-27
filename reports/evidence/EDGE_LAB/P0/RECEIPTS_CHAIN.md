# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 4c3eeb8ff082
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 136 |
| final_chain_hash | `3d6696d78d5f2f7cd3053c4497e434113c849b063d51f421654d85ada61442f6` |
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
| 10 | `EDGE_LAB/EVIDENCE_INDEX.md` | `365532e76159b691…` | `2433101691a57642…` |
| 11 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `75e11be1ba110b21…` |
| 12 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `bf83352ab92eba2a…` |
| 13 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `31555e616411034c…` |
| 14 | `EDGE_LAB/EXECUTOR_ENTRYPOINT_DOCTRINE.md` | `b7c2ce5051762b3b…` | `599dad7a006750fd…` |
| 15 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `fef94e078d1c6cbb…` |
| 16 | `EDGE_LAB/EXPECTANCY_POLICY.md` | `c7a45d923b14dc19…` | `38e5a5649ca38ffb…` |
| 17 | `EDGE_LAB/FINAL_VERDICT.md` | `172031481ccb1ae6…` | `52fa7465e2b932f8…` |
| 18 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `665dafd4ec7c6f00…` |
| 19 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `091302d47022c38e…` |
| 20 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `ddfb94205c21bce7…` |
| 21 | `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `ceda190573d8016d…` | `ed04f0b4389df544…` |
| 22 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `62bae52c4210145b…` |
| 23 | `EDGE_LAB/LIQUIDATIONS_INTELLIGENCE_ROUTE.md` | `3826ef2bd267ce0f…` | `8d846866ea7bcb81…` |
| 24 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `c1a90d333ca23cc3…` |
| 25 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `d5c3f704b9e3b0f6…` |
| 26 | `EDGE_LAB/OPERATOR_SINGLE_ACTION.md` | `e8ce20889d3d3302…` | `e30c71e32bc4351d…` |
| 27 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `16fc73943cee2ecd…` |
| 28 | `EDGE_LAB/OVERFIT_POLICY.md` | `c3ed08d18fc63e6e…` | `fee187233d376778…` |
| 29 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `0238712d887b131a…` |
| 30 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `ece9d133a11d3bba…` |
| 31 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `f3c87bca15c47bbf…` |
| 32 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA.md` | `f73490a9bf2e342b…` | `0abdacde5b03bd02…` |
| 33 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `c11b54d73cabb5c4…` |
| 34 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `918fcd740b67dc23…` |
| 35 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `10b0f5e1da6b83fa…` |
| 36 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `84318edbb37165ac…` |
| 37 | `EDGE_LAB/PORTABLE_PROOF_PACK.md` | `de2f23bf0061566c…` | `137693d92a66f897…` |
| 38 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `baaecf64a5c1c9e0…` |
| 39 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `ecba212c286a5d88…` |
| 40 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `82612e57508cd13a…` |
| 41 | `EDGE_LAB/PROFIT_FOUNDATION_FREEZE.md` | `2d55be7803dc10ed…` | `97f3193e95697eea…` |
| 42 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `5bca2d4744d39a69…` |
| 43 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `bc387884c91092bf…` |
| 44 | `EDGE_LAB/PUBLIC_DATA_READINESS.md` | `f1d1e08939ef145b…` | `7cd5688e4710d098…` |
| 45 | `EDGE_LAB/REAL_PUBLIC_EVIDENCE_POLICY.md` | `fd65d4cd144b2724…` | `eda00f7ff422afe8…` |
| 46 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `ed5d7b3e04cc2aa1…` |
| 47 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `f0e97583b1f4c6ab…` |
| 48 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `424faac1b65dd05e…` |
| 49 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `e108f874ee122414…` |
| 50 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `ed82e2ce54698faf…` |
| 51 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `ba894a2b023a6a77…` |
| 52 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `48540fd2c5422967…` |
| 53 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `1362324e096170d8…` |
| 54 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `c1479fa85f9635d7…` |
| 55 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `667654d81ae0adf7…` |
| 56 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `88e6280efccdaad4…` |
| 57 | `EDGE_LAB/TRUTH_SEPARATION.md` | `a248eeec7f116e9d…` | `9a9c7d6fd9993313…` |
| 58 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `109beb504e8419eb…` |
| 59 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `e420edcb69f14863…` |
| 60 | `EDGE_LAB/VICTORY_SEAL.md` | `81be796b26762c25…` | `7997749cf11e3b00…` |
| 61 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `2916e969e4ae5273…` |
| 62 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `407d41b0af74e334…` |
| 63 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `15e9985634823271…` | `4c283667bede3183…` |
| 64 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `2faa316fb5a9710c…` | `3191df5c76d6f00e…` |
| 65 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `9fb7362d4cdf0c49…` | `341248122c5aaf8b…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `ea28199cdff2bb3d…` |
| 67 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `4feaf9c1824aaeb6…` |
| 68 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `220db0099ac44ffa…` |
| 69 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `35af4023cec6403d…` |
| 70 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `a8f42adc6c7a736d…` |
| 71 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `f7d417b652e65f45…` |
| 72 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `7b637237b5693a21…` |
| 73 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `30d9aecd188d2b1d…` |
| 74 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `7fdcb39e214f5b66…` |
| 75 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `c796a99daa0b4f74…` |
| 76 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `d38f60c406e7b023…` |
| 77 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `020c70b80d233c05…` |
| 78 | `scripts/edge/edge_lab/canon.mjs` | `8baf3e36b25265ff…` | `7e16ba34d0590d9d…` |
| 79 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `f6786ffcc479cc3a…` |
| 80 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `10094a0ca9852780…` |
| 81 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `328932b331412da4…` |
| 82 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `8b80d862cfd6c6b9…` |
| 83 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `3c9b3a08c62556ef…` |
| 84 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `7a6dd57b9b689390…` |
| 85 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `861975c575172b37…` |
| 86 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `3a03ac48b713c9a1…` |
| 87 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `906ebfb7b01899e1…` |
| 88 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `89df0b501555907f…` |
| 89 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `6e50b816008062c6…` |
| 90 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `7526ada80208d635…` |
| 91 | `scripts/edge/edge_lab/edge_execution_reality_court.mjs` | `29cda45d2808c601…` | `f9944d170b6dc130…` |
| 92 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `cbb7faa1e58d6039…` |
| 93 | `scripts/edge/edge_lab/edge_expectancy_court.mjs` | `99afd7af03668332…` | `2befbb9dcf12e029…` |
| 94 | `scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs` | `f92524173b85553a…` | `475dfc7ef63ac3fb…` |
| 95 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `5f0d1490bd79bf05…` |
| 96 | `scripts/edge/edge_lab/edge_liq_00_acquire_bybit.mjs` | `35d6c64afe21175c…` | `5c92a9e77dc3012f…` |
| 97 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `854d6bb6130ba563…` |
| 98 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `2d293c33bb0741ba…` |
| 99 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `56954d0ed2d1348d…` |
| 100 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `9c08fc47cdd6bc16…` |
| 101 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `1f34c740c2927d15…` |
| 102 | `scripts/edge/edge_lab/edge_overfit_court_mvp.mjs` | `8bb441b6040ceef9…` | `56d77bbc5d3b26b2…` |
| 103 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `a64170f9756d8d27…` |
| 104 | `scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs` | `48ac74d0568be9f8…` | `21d62271641cd70d…` |
| 105 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `861c1f78ea2e0fa6…` |
| 106 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `d78d609419e22cee…` |
| 107 | `scripts/edge/edge_lab/edge_profit_00_acquire_public_diag.mjs` | `0ed2b9c77a154d25…` | `0458cd0c66d60889…` |
| 108 | `scripts/edge/edge_lab/edge_profit_00_acquire_public_smoke.mjs` | `34ada8f1cdebd8b3…` | `777917b01b81b958…` |
| 109 | `scripts/edge/edge_lab/edge_profit_00_acquire_real_public.mjs` | `14bd5a8add0f8fd0…` | `cab5deeeb69c9069…` |
| 110 | `scripts/edge/edge_lab/edge_profit_00_closeout.mjs` | `7217bfcff9f5c0d1…` | `51c076481b8a97a0…` |
| 111 | `scripts/edge/edge_lab/edge_profit_00_doctor.mjs` | `225d0fd8d29c2b4f…` | `7056ab14a5f33468…` |
| 112 | `scripts/edge/edge_lab/edge_profit_00_expect_blocked_conflict.mjs` | `1da46caf8a44a866…` | `eaa91de9eb47674a…` |
| 113 | `scripts/edge/edge_lab/edge_profit_00_paths.mjs` | `0ac61fd31658db66…` | `42e0e163dc9f94b8…` |
| 114 | `scripts/edge/edge_lab/edge_profit_00_x2.mjs` | `637405f3b3dfe709…` | `84922f08ce3cae05…` |
| 115 | `scripts/edge/edge_lab/edge_profit_01_super.mjs` | `b23a50af2f8b152a…` | `4c71e59eb53d9167…` |
| 116 | `scripts/edge/edge_lab/edge_profit_02_expectancy_proof.mjs` | `8119cf9d6a9f52ec…` | `046e70eccc98fb87…` |
| 117 | `scripts/edge/edge_lab/edge_profit_02_pbo_cpcv.mjs` | `2314d1c387bd692d…` | `01b8c7da0b3c9646…` |
| 118 | `scripts/edge/edge_lab/edge_profit_02_proof_index.mjs` | `8fce04d720e5c9b4…` | `34c38fa68bad02fc…` |
| 119 | `scripts/edge/edge_lab/edge_profit_02_risk_mcdd.mjs` | `1a3e77d3f878c486…` | `e03dafc1fa2320f1…` |
| 120 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `051f138b408af4df…` |
| 121 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `27a095d8ae789061…` |
| 122 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `cabff8579a431ef9…` |
| 123 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `66fecb4a88b6c84b…` |
| 124 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `156c104cd75cac3a…` |
| 125 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `b5915c885d33021c…` |
| 126 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `eab71cc41172b715…` |
| 127 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `19d839b34506f3a8…` |
| 128 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `929f837608f8174b…` |
| 129 | `scripts/edge/edge_lab/edge_walk_forward_lite.mjs` | `902ec6a161cccb1b…` | `13419790ae39de98…` |
| 130 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `198047f73034322a…` |
| 131 | `scripts/edge/edge_lab/paper_telemetry_import_csv.mjs` | `2f4cdceb8abf9ae4…` | `7ae9d80aed14c291…` |
| 132 | `scripts/edge/edge_lab/paper_telemetry_real_drop_unpack.mjs` | `1333ca88eeab386d…` | `11ab25228f9d2bd3…` |
| 133 | `scripts/edge/edge_lab/paper_telemetry_real_sandbox_gen.mjs` | `54ffe8410b37ed54…` | `a29b949c31981f3e…` |
| 134 | `scripts/edge/edge_lab/paper_telemetry_real_stub_gen.mjs` | `a3e150170e7e5e2b…` | `5b20d3ce40eda346…` |
| 135 | `scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs` | `dec02f9e858a7b27…` | `3d6696d78d5f2f7c…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
