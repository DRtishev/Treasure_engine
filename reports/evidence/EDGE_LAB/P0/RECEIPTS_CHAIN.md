# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3d37e68311e2
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 93 |
| final_chain_hash | `74102da058d4ac1e79c327264fdec186e9034df3d197f3870a11d8bc365e6de2` |
| scope_manifest_sha | `b9b2c3f00e4f369eae5ae9be4dc5df2960923893ba0e1b88b6318b67391bb071` |
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
| 5 | `EDGE_LAB/DEP_POLICY.md` | `da988ee18713d7d9…` | `450ea2af96b4db59…` |
| 6 | `EDGE_LAB/ERROR_BUDGET_POLICY.md` | `fbd5cc865ac70276…` | `5e1f8d648b4f5aaa…` |
| 7 | `EDGE_LAB/EVIDENCE_CANON_RULES.md` | `021ba0511726a903…` | `2997e6a8d80257e7…` |
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `39d5dc046cd59985…` | `d4c0b19a15b50e79…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `0fc99a7badebece5…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `ad4c47a6e2c16c9f…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `73f38b7120478b0f…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `c97ffade326cf822…` |
| 13 | `EDGE_LAB/FINAL_VERDICT.md` | `9f0e5aa9d5281fbb…` | `ba8bc43eeffb7865…` |
| 14 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `fd8fce03cefefe2c…` |
| 15 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `66cc91735a32990e…` |
| 16 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `9aba0790d1610f7a…` |
| 17 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `148a61c168efe912…` |
| 18 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `ac674ab2a3f054a5…` |
| 19 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `d7f7d5a759e5c69f…` |
| 20 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `44881472cd95e888…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `1f2e752ef5064d0c…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `bf727ab20ba7f6ba…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `5525b94d4105797f…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `e79d6979cdb0ce4e…` |
| 25 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `a571039a6680cbe9…` |
| 26 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `ef34d6b3a102ab11…` |
| 27 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `dcf2a472fd3e8745…` |
| 28 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `142fe33e1ae74f94…` |
| 29 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `1471e79d8f4741f0…` |
| 30 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `c1392fd7da3828bd…` |
| 31 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `208617b5cba74be1…` |
| 32 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `41b0863eb7ead9b0…` |
| 33 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `f4c4a672af4d9c84…` | `a6a448470f03ce05…` |
| 34 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `083658176a10bbc6…` |
| 35 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `b2e5820f16ea4066…` |
| 36 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `c947de4248489d53…` |
| 37 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `11f4a8c9332fd0bd…` |
| 38 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `3188c69f904b0a1a…` |
| 39 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `e512d319ca5a138e…` |
| 40 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `7a1e209698865bc0…` |
| 41 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `e1754ebf1daf29d6…` |
| 42 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `fc69aacb5edf22b7…` |
| 43 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `ac837bd8f4784f68…` |
| 44 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `69b998e545df29f4…` |
| 45 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `5336c910add4137a…` |
| 46 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `099179d36b9a133f…` | `b4aa524f2a38098a…` |
| 47 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `673de2b7fe759c28…` | `210a922627601db0…` |
| 48 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `f412ca72d75bae5a…` | `394106efdf23634f…` |
| 49 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `a9246ef8211d48fc…` |
| 50 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `40acdcc02c0a4d79…` |
| 51 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `a8ac35921944d468…` | `32e85235f2369354…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `520754f835e7d2de…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `38126c80b22a9a96…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `e58ac2bda5492a36…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `8b8790d25c74a8df…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `7bc28fa7d281645d…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `c3906e3c374b4482…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `94f07525eb4c439d…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `f6b7e942a192c9ce…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `fd0c30d90fd4823a…` |
| 61 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `b8059581af2e5797…` |
| 62 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `bf4015dc645ea232…` |
| 63 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `36199953b400df8f…` |
| 64 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `24ab9b18faedfa1b…` |
| 65 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `2b67130036c8128f…` | `6516cef201d0f708…` |
| 66 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `ef3584d6e025c450…` |
| 67 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `7bf57082485fe767…` |
| 68 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `6287d2e2e40102f4…` |
| 69 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `639c01c7cec03c65…` | `d3524e08dd34f153…` |
| 70 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `93b3d96f284f0341…` |
| 71 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `708de82c3faf4e6f…` |
| 72 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `a7afc3638e431b3d…` |
| 73 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `5ff7090b8410cbac…` |
| 74 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `45fa9a67d0744013…` |
| 75 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `300b69342bc558fe…` | `54ddce131bb03978…` |
| 76 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `4f12d0b0f9efa834…` |
| 77 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `deb886ac05d37512…` |
| 78 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `08a68669e8dcdf84…` |
| 79 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `5b2904bcad5004ff…` |
| 80 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `e9dd123f4f8cf472…` |
| 81 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `59d13d63ba0ea086…` |
| 82 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `0da5b0bee46d3cfe…` |
| 83 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `2c704ab9e32887b0…` |
| 84 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `4e52b0350c8f71d9…` |
| 85 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `eb9132a9d3ff2f53…` |
| 86 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `6993c23ed81b8985…` |
| 87 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `d2f4310e46253890…` |
| 88 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `6440882d398ce0fe…` |
| 89 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `cdefbec45e5c2859…` |
| 90 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `769a1d181790c557…` |
| 91 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `215649f5abc54460…` |
| 92 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `74102da058d4ac1e…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
