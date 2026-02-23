# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: b455ad077aff
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 115 |
| final_chain_hash | `0cb69e38613a67cc0edb3fb5db6be0ee203bd6f5957504f102df79d010384d10` |
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
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `4ebbe11f1a616e4c…` | `eb8d0009ea324a7a…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `f919c3657928665b…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `087bd26b14d10c9a…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `6b248160b37be71c…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `8ded093ac60582ec…` |
| 13 | `EDGE_LAB/EXPECTANCY_POLICY.md` | `c7a45d923b14dc19…` | `7751d1249fe6718e…` |
| 14 | `EDGE_LAB/FINAL_VERDICT.md` | `e450b201d9348129…` | `d997a46469163c20…` |
| 15 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `dff0640863122c8f…` |
| 16 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `1697634915d842f3…` |
| 17 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `38004fe0a24809e5…` |
| 18 | `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `ceda190573d8016d…` | `aeb99a8009e93bc6…` |
| 19 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `f80e973b14a524ed…` |
| 20 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `42861a3da1c36247…` |
| 21 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `e4d492d93c3ca12a…` |
| 22 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `1bc32f7b5db7a1cf…` |
| 23 | `EDGE_LAB/OVERFIT_POLICY.md` | `c3ed08d18fc63e6e…` | `ed8d13d67e0f0bd5…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `60be4f37af9234a0…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `d0dba1093e52945c…` |
| 26 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `53991c73b8232fdc…` |
| 27 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA.md` | `f73490a9bf2e342b…` | `3aebc0e9a6400ce6…` |
| 28 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `354b5ed3f0fec051…` |
| 29 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `84c323a8b02e8968…` |
| 30 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `6f5a2cbc198ad1f4…` |
| 31 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `37fd1a873cc5f84a…` |
| 32 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `11524ce88180abf9…` |
| 33 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `3e17ba978b576ac2…` |
| 34 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `f10197a7f8eaa103…` |
| 35 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `303e231cdda78b64…` |
| 36 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `d575438d1deb0a51…` |
| 37 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `1fea401443abe532…` |
| 38 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `0a6dc2ac53c1eba3…` |
| 39 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `4d24e3d376dd43d7…` |
| 40 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `dc102f311c9e0d1a…` |
| 41 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `00e313cbbeab6536…` |
| 42 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `9b066d23506c98c6…` |
| 43 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `fadffd5920a916f3…` |
| 44 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `cc9ad60da983df57…` |
| 45 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `2d899ffc25bbf0d7…` |
| 46 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `8dd77dbbaf5920b3…` |
| 47 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `48ddb4f0ddb46536…` |
| 48 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `09b46b32667521e1…` |
| 49 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `a68423dda2bde5c5…` |
| 50 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `5a6d36d21be46ed9…` |
| 51 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `e076a10030f0af14…` |
| 52 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `efe093c259819b6c…` | `40ae52d7852620be…` |
| 53 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `d402bbdbc8ba9c99…` | `13d02c7c4b4f3c9f…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `261796564ae4cf0d…` | `367370fecc08480c…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `eb0025edcd4ce085…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `6dfcbbbe2e134cd7…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `9dc8880187987048…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `893d1cab4f805a10…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `dd7db791e6397f4f…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `3a35fd8f43daeb55…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `2bc1e9c72369a8af…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `ac32859d567757b5…` |
| 63 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `123f6445dc5ecab0…` |
| 64 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `ce8662ed6b07d18e…` |
| 65 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `58fe1d97a2a59266…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `db50ecb62dbe26c3…` |
| 67 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `9023ae699226a43c…` |
| 68 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `daea4bade1919ab3…` |
| 69 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `858dec5a39c71896…` |
| 70 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `2a26f03557faf588…` |
| 71 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `18bcac438b1e2818…` |
| 72 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `1e5c219591eb0184…` |
| 73 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `19342499793f400c…` |
| 74 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `4be2ee2d8fd13f76…` |
| 75 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `7ed8e0368dc58f7b…` |
| 76 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `e3b726d35798262c…` |
| 77 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `13b576e5a1cc3958…` |
| 78 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `78b041f743f0c5b5…` |
| 79 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `e503205a40c3386e…` |
| 80 | `scripts/edge/edge_lab/edge_execution_reality_court.mjs` | `29cda45d2808c601…` | `bf9efc7b2c3e6dda…` |
| 81 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `e12668bcaca428c6…` |
| 82 | `scripts/edge/edge_lab/edge_expectancy_court.mjs` | `99afd7af03668332…` | `d2595670ef11d351…` |
| 83 | `scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs` | `f92524173b85553a…` | `fd6a99ecc1cacfde…` |
| 84 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `073b3ec8a1d19b6b…` |
| 85 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `1a1d6994d6edcd2d…` |
| 86 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `821c75d9952d627a…` |
| 87 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `13f227a79112a62b…` |
| 88 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `fadba88f21ca33f6…` |
| 89 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `03303f8e27683698…` |
| 90 | `scripts/edge/edge_lab/edge_overfit_court_mvp.mjs` | `8bb441b6040ceef9…` | `3c5d827ca9c8f306…` |
| 91 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `4fad84e5e2039b8d…` |
| 92 | `scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs` | `196646e0b578f0a3…` | `49ce01de593eb2f4…` |
| 93 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `95380b841ea4dc6c…` |
| 94 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `d5409849773addc4…` |
| 95 | `scripts/edge/edge_lab/edge_profit_00_closeout.mjs` | `d28b1af257b27389…` | `987698dd4a1c71b6…` |
| 96 | `scripts/edge/edge_lab/edge_profit_00_doctor.mjs` | `7c083a6c990889f5…` | `a83628768675ec64…` |
| 97 | `scripts/edge/edge_lab/edge_profit_00_expect_blocked_conflict.mjs` | `1da46caf8a44a866…` | `da6aaee833e1362d…` |
| 98 | `scripts/edge/edge_lab/edge_profit_00_paths.mjs` | `5993bbb60fe2d6c7…` | `3252dd64035140be…` |
| 99 | `scripts/edge/edge_lab/edge_profit_00_x2.mjs` | `637405f3b3dfe709…` | `49027e3ea7762558…` |
| 100 | `scripts/edge/edge_lab/edge_profit_01_super.mjs` | `b23a50af2f8b152a…` | `8f230b129927509d…` |
| 101 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `110b6f7e16b22036…` |
| 102 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `f3cc24c243e4ae25…` |
| 103 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `ca851b6298d21ec6…` |
| 104 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `79648683d8c196fe…` |
| 105 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `0c53d3ed9ebe6b6e…` |
| 106 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `b35697a209c68d30…` |
| 107 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `b434ef6e3b892e35…` |
| 108 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `238613df650ac421…` |
| 109 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `da561fe8583629be…` |
| 110 | `scripts/edge/edge_lab/edge_walk_forward_lite.mjs` | `902ec6a161cccb1b…` | `9bae9e086ab2e1c5…` |
| 111 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `6e89421d894a376b…` |
| 112 | `scripts/edge/edge_lab/paper_telemetry_import_csv.mjs` | `02e43b66388dfa52…` | `40324227bc374f5a…` |
| 113 | `scripts/edge/edge_lab/paper_telemetry_real_stub_gen.mjs` | `f93a3f04672505f6…` | `04507e56359fc60d…` |
| 114 | `scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs` | `dec02f9e858a7b27…` | `0cb69e38613a67cc…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
