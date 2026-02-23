# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 6eec9cd2d45e
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 96 |
| final_chain_hash | `64f0bfcee42d6d4ebb29fec7582a22e600c3b2d9ebfc4bac2c3d576a47415de0` |
| scope_manifest_sha | `0b75f6c15507133c7775dd85d627b7f87b8582d4093adf5ee20074fcbafcf213` |
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
| 5 | `EDGE_LAB/DEP_POLICY.md` | `857c544a6609997b…` | `8e1f4434b84ca30c…` |
| 6 | `EDGE_LAB/ERROR_BUDGET_POLICY.md` | `fbd5cc865ac70276…` | `74232a73a734ef85…` |
| 7 | `EDGE_LAB/EVIDENCE_CANON_RULES.md` | `021ba0511726a903…` | `4cc8fb18333ed379…` |
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `2bfe00fd1a21b134…` | `7cd3bca9ec54c010…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `0c9be315ed5b9ed7…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `ffa5c4114e07492f…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `a1b1c996097f8046…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `2f0ae1d401b1f977…` |
| 13 | `EDGE_LAB/FINAL_VERDICT.md` | `30d2aca73a2e8707…` | `9f43075adf762768…` |
| 14 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `6520bc08db8e7e35…` |
| 15 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `0cca05d827274fbc…` |
| 16 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `3c6f5b9522e47a8f…` |
| 17 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `cd3bd58cbed72527…` |
| 18 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `35bf55b76be8fbf7…` |
| 19 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `88e70af565f85df4…` |
| 20 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `96379805529eb631…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `2ca1bc73f92de291…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `cf4d3db49ab5f700…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `6713460659758813…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `126e20e62c3fb400…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `312af9ba17f25469…` |
| 26 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `b1b660409119b01f…` |
| 27 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `15825390cb0dc93c…` |
| 28 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `f2ce8f73075e55f0…` |
| 29 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `7bb0ea9603989db3…` |
| 30 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `74828d78c979b4b2…` |
| 31 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `c94e1f3664725cf2…` |
| 32 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `34f8db12386d22a1…` |
| 33 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `41389caa735d32d4…` |
| 34 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `bb7bcd3b55cf664e…` |
| 35 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `3d4e5ac704a85ed7…` |
| 36 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `d993bf307c41196f…` |
| 37 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `c47ea58744f73421…` |
| 38 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `febce4764684c161…` |
| 39 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `594f7513176a97f4…` |
| 40 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `ba06af02305ce159…` |
| 41 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `625f3186caa8a2b2…` |
| 42 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `310c9ab22a97a66f…` |
| 43 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `42ec80beccd86139…` |
| 44 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `8cec24c8fa49bc1f…` |
| 45 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `fa5b3e5de8f67cf4…` |
| 46 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `23600389b553a247…` |
| 47 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `b2ba7c1969617222…` | `539f6a680f208271…` |
| 48 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `cc9bfbdd23b445dd…` | `6f575ba968dea213…` |
| 49 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `340349040719f555…` | `4b459ae7d5ebd4fc…` |
| 50 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `8b55acfc967fd752…` | `7ea9c1e8f3026c22…` |
| 51 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `df317c969bb4d665…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `b1320cdf0341385e…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `1c82cb80b1b92f3d…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `f5e476fcd11b3720…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `f5083aa7d34f9a06…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `e71e3b704f4004a4…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `089599e82901663e…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `0c409a5d76ea39c0…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `baac9a0391041207…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `7647b1b5fb0eb41b…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `e54c23db078e24f1…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `c772c9268d98d579…` |
| 63 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `5e14f50c7cde54b6…` |
| 64 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `d61a325ff345e90e…` |
| 65 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `f32fa625704233c5…` |
| 66 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `ab53d979a1a6f67c…` |
| 67 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `fd47a06d76adb3e1…` |
| 68 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `8436ca967ee02ffa…` |
| 69 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `58320f5b3bece01e…` |
| 70 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `d4e5b175478f76c3…` |
| 71 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `76ac2fa34794d09d…` |
| 72 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `202d6bc34f165d6d…` |
| 73 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `f8d6b58ba870ed4c…` |
| 74 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `021eec6c257ce913…` |
| 75 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `123c3ebf114fa77a…` |
| 76 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `5427dbce1a7ac5da…` |
| 77 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `ff49eca1e5247a6a…` |
| 78 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `2a793a191b2d2815…` |
| 79 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `685a77171f4b5470…` |
| 80 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `d1a9001be83b5952…` |
| 81 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `e68ce2f0be55dd44…` |
| 82 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `9dae083a5f822fba…` |
| 83 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `8b403b66d33ebc2d…` |
| 84 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `a08dbcb898be1733…` |
| 85 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `3a08e5a63c564aa6…` |
| 86 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `6d44b381cc28bc7e…` |
| 87 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `05346e74f885d2ed…` |
| 88 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `fe72612cb5f2f80c…` |
| 89 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `7859142b88793d67…` |
| 90 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `5e7c91eab23c5828…` |
| 91 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `f623e767ebcacd9f…` |
| 92 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `5f0ea9ffb502189c…` |
| 93 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `056464483568f751…` |
| 94 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `0ce8ec8592658a26…` |
| 95 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `64f0bfcee42d6d4e…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
