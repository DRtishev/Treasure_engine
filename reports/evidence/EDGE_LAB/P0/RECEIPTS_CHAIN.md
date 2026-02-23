# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 7df4dc3a1062
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 119 |
| final_chain_hash | `3595cdd84df9f0828a95b2e04be529f4f905a2179d9ee8e841e58e8d00359a64` |
| scope_manifest_sha | `2dfccc092d7c304f375b2e02364b97eb71379d70e4c340daabd4b88c701d2782` |
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
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `a29079617dcfb3d5…` | `7bc27c351ef6cbd2…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `7278bda0b82d1d2f…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `2d5dd91ca6157c41…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `9746e225f87253c2…` |
| 12 | `EDGE_LAB/EXECUTOR_ENTRYPOINT_DOCTRINE.md` | `b7c2ce5051762b3b…` | `fca0978fdaac8a62…` |
| 13 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `b3cb4d689a4badf5…` |
| 14 | `EDGE_LAB/EXPECTANCY_POLICY.md` | `c7a45d923b14dc19…` | `2dbdc7d9555bcf19…` |
| 15 | `EDGE_LAB/FINAL_VERDICT.md` | `95770fdcbd51eda7…` | `a55257f94ec1dd26…` |
| 16 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `52903408d4d095b5…` |
| 17 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `fdf2740e743687d9…` |
| 18 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `5972a5c09bea161c…` |
| 19 | `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `ceda190573d8016d…` | `682cf841aefa1bc4…` |
| 20 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `f586c9a3cc0a75d2…` |
| 21 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `1d5cbb7677b93382…` |
| 22 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `5640a67baf68c430…` |
| 23 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `18b81e6070d3e671…` |
| 24 | `EDGE_LAB/OVERFIT_POLICY.md` | `c3ed08d18fc63e6e…` | `a2d55660f282dcaf…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `61d399db1b551fcb…` |
| 26 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `80c9803ff25ec29a…` |
| 27 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `84391d04aa272b0c…` |
| 28 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA.md` | `f73490a9bf2e342b…` | `8d68e367154bdd71…` |
| 29 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `3fa9db0db9e65170…` |
| 30 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `dbe8f789e713cbb5…` |
| 31 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `6b1ba6cc16754319…` |
| 32 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `49751ba8f555bf2f…` |
| 33 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `03678ed90f3f3e67…` |
| 34 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `5cc5b6edbd052e7a…` |
| 35 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `8b8d88d73a762953…` |
| 36 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `2add4070a9997d91…` |
| 37 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `decb2fa6c5fcdda1…` |
| 38 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `65cbc2101a6b7ca3…` |
| 39 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `43678ef8f5df2c3c…` |
| 40 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `fb7c80fc024c01ee…` |
| 41 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `8d619e3b2eebbb73…` |
| 42 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `eb491f38458a3d39…` |
| 43 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `a49b5d6e8605d3d9…` |
| 44 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `4662a257880a997a…` |
| 45 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `61d3dcdcdbb12366…` |
| 46 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `b7a63869adab1c53…` |
| 47 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `6d80b305fe01efdf…` |
| 48 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `72ec894e98db41ae…` |
| 49 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `6096efee57685b95…` |
| 50 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `ba6c9efe01222015…` |
| 51 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `af95802f50c217e4…` |
| 52 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `0d2d706192ebc7b3…` |
| 53 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `f2140a07203d0c6f…` | `04ca5b3fb5ffb68f…` |
| 54 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `320d0e04cdab3c77…` | `62219dfc3a099fe4…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `ad28f3a95e23b402…` | `01cedfe7c64ab00e…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `a44d8da79e5ef344…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `055e6c399668ca9b…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `b3b53f1b38bb2648…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `55236f86a32b30a7…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `dcf182639de2eb31…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `d287383585b71705…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `aab1987daae1efea…` |
| 63 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `04490c4dcc29617d…` |
| 64 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `8d0f7a49d3b951fa…` |
| 65 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `134235b5009f78f5…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `d1a7ac1794cf6251…` |
| 67 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `ea12570eafa1371b…` |
| 68 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `9e50c56071bc5e6f…` |
| 69 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `93c30a364a4db11d…` |
| 70 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `c5a1e0e1b06ca3cb…` |
| 71 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `d05d06cf462296ab…` |
| 72 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `489ef4f72726e358…` |
| 73 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `bc11d7456b35df83…` |
| 74 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `fe53fed5369e5158…` |
| 75 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `196c68f46cf9ee5c…` |
| 76 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `0065a077e6cd123e…` |
| 77 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `31096137d5b3a930…` |
| 78 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `31e421ad24cba614…` |
| 79 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `84383acbaf221c2b…` |
| 80 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `f303191b6c7de804…` |
| 81 | `scripts/edge/edge_lab/edge_execution_reality_court.mjs` | `29cda45d2808c601…` | `1d788388738336c3…` |
| 82 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `108620c7e21bebeb…` |
| 83 | `scripts/edge/edge_lab/edge_expectancy_court.mjs` | `99afd7af03668332…` | `65319ad077046882…` |
| 84 | `scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs` | `f92524173b85553a…` | `5d663ee231635cac…` |
| 85 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `f165b13a7db8effb…` |
| 86 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `58d0165905f9e0d7…` |
| 87 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `8edb5e0e2fc896f0…` |
| 88 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `9aaed3f9e4a67de5…` |
| 89 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `ab8d482e82bc6141…` |
| 90 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `d28bc66f236ca883…` |
| 91 | `scripts/edge/edge_lab/edge_overfit_court_mvp.mjs` | `8bb441b6040ceef9…` | `ad08bdb80ac78dc4…` |
| 92 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `285e2ab610109a07…` |
| 93 | `scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs` | `cf591e05e2c0f746…` | `fc206424019cdf18…` |
| 94 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `bd9cfabf8f6efe28…` |
| 95 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `7262cf36212aaa87…` |
| 96 | `scripts/edge/edge_lab/edge_profit_00_closeout.mjs` | `7b602132b23903c4…` | `f11b7cb8edb9a3b5…` |
| 97 | `scripts/edge/edge_lab/edge_profit_00_doctor.mjs` | `b1ea767a1fb234c3…` | `cd9eecf5fc323afb…` |
| 98 | `scripts/edge/edge_lab/edge_profit_00_expect_blocked_conflict.mjs` | `1da46caf8a44a866…` | `142156175ddb5397…` |
| 99 | `scripts/edge/edge_lab/edge_profit_00_paths.mjs` | `5993bbb60fe2d6c7…` | `cae614ba2661a9e0…` |
| 100 | `scripts/edge/edge_lab/edge_profit_00_x2.mjs` | `637405f3b3dfe709…` | `d9b2dd697c70a972…` |
| 101 | `scripts/edge/edge_lab/edge_profit_01_super.mjs` | `b23a50af2f8b152a…` | `569acfddc0fe3c21…` |
| 102 | `scripts/edge/edge_lab/edge_profit_02_expectancy_proof.mjs` | `a9eb0e0db101ba05…` | `3cebe9ffde04d4a6…` |
| 103 | `scripts/edge/edge_lab/edge_profit_02_pbo_cpcv.mjs` | `d23b6db553279a5f…` | `6b6addbd324761b2…` |
| 104 | `scripts/edge/edge_lab/edge_profit_02_risk_mcdd.mjs` | `3ce2620d05965b88…` | `0d69feb360198399…` |
| 105 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `9282d52daa896f36…` |
| 106 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `6e7d32aa9519384b…` |
| 107 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `c25c50aad15f44c4…` |
| 108 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `675bddf6f457634e…` |
| 109 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `ff476effd9051349…` |
| 110 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `5b7de267aa5f6e06…` |
| 111 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `4c478e2746768453…` |
| 112 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `e273c3ec6f3913dd…` |
| 113 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `f2b955500bf961d0…` |
| 114 | `scripts/edge/edge_lab/edge_walk_forward_lite.mjs` | `902ec6a161cccb1b…` | `91e962ff8786310f…` |
| 115 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `2572e4f3622c3781…` |
| 116 | `scripts/edge/edge_lab/paper_telemetry_import_csv.mjs` | `02e43b66388dfa52…` | `f4c97507a5f016f7…` |
| 117 | `scripts/edge/edge_lab/paper_telemetry_real_stub_gen.mjs` | `d652183d83a86bdb…` | `2035ede30d2116a6…` |
| 118 | `scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs` | `dec02f9e858a7b27…` | `3595cdd84df9f082…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
