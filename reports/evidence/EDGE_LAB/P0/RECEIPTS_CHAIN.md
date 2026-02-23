# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 1036a732eb93
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 96 |
| final_chain_hash | `d2fbc2a775290d74257cc5aca4cb9e1e9e139a34f74116f8963543bf86471fa8` |
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
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `96d9fb0d2def5e87…` | `d68ddf3f3bfe8592…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `4a141af38da32a10…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `2e8d63ea3970ab0b…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `0f7c811c07bdd76d…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `e83609be08fa488c…` |
| 13 | `EDGE_LAB/FINAL_VERDICT.md` | `1a02efdaa277e8fd…` | `5f25d97b5e1de921…` |
| 14 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `c8869ea83c703937…` |
| 15 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `3a4295e2a980dbf5…` |
| 16 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `309df37b75315561…` |
| 17 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `2489749d40b08ab2…` |
| 18 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `912ba210b8147f3a…` |
| 19 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `01aec77c3fd5c4a7…` |
| 20 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `74d512a0ca35fb59…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `e67a71be3ba24893…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `2462a2e039fda5a5…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `f5b067c98f05cd7d…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `3d04562c0bfa2362…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `cafa09e66a574f61…` |
| 26 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `a0d66fbeffc7926d…` |
| 27 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `6d2c1130d3c0db5a…` |
| 28 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `d9d58014aa1ff0e3…` |
| 29 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `3f8aa29ad61a6e3a…` |
| 30 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `e9714a1049143b2b…` |
| 31 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `d1e34940645c8f27…` |
| 32 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `0bc05901c21f4840…` |
| 33 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `df021ba5e5857687…` |
| 34 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `0c2eb6f764d0af71…` |
| 35 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `768b84f60f123364…` |
| 36 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `cb5cc3bc6ab04282…` |
| 37 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `436ef38dfed0bcb9…` |
| 38 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `b9e4960677d0257b…` |
| 39 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `5df5243dd4cf5449…` |
| 40 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `9e3d7f21013b6284…` |
| 41 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `0121fdd2f81bd0e8…` |
| 42 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `e4fa307c40e0059d…` |
| 43 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `595b1cf8ae4dda48…` |
| 44 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `bc2638bcda4e26b8…` |
| 45 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `4e3bd10d86a4f84a…` |
| 46 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `59e3750594eccd1c…` |
| 47 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `c9219704ac3635e9…` | `c90a6a30849732ea…` |
| 48 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `8d04b467da6285ca…` | `c0c8c204beb66773…` |
| 49 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `988f05e6b1c34b68…` | `bac35633cedc5611…` |
| 50 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `d1fd2831646fb7db…` | `c4f8c1dfaa77aa2a…` |
| 51 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `f081af8a8100d627…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `8e4ec36a64845c11…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `62f0ec8aced6cb5c…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `bf8e1f81511383e9…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `71214833412500af…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `6ab02b87632b70ca…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `4007e0d417ec2fd8…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `cc677376027bf9cc…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `de71dc195b8a9cca…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `312ea32529a34cd1…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `e821e1bfc066f763…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `fe513ed3613de96d…` |
| 63 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `d7ba70a19dc3295c…` |
| 64 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `9d9620f61e50630b…` |
| 65 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `5a44b5961d2f625b…` |
| 66 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `7d59e78835f67ad9…` |
| 67 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `ca8f4a3551313313…` |
| 68 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `109e93929012720c…` |
| 69 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `097b1b3357a500ec…` |
| 70 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `94ed76492e060aef…` |
| 71 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `3f1688824f378e09…` |
| 72 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `6d7dde54664d6553…` |
| 73 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `fcca8d49a88c2c13…` |
| 74 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `9118f757e2006eaa…` |
| 75 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `6d8a8eca52cdd4b1…` |
| 76 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `32187b6c22f2163a…` |
| 77 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `d20eadd84fba25ed…` |
| 78 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `d9ef446e5b12d351…` |
| 79 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `d0a16b9388e8754a…` |
| 80 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `35c343df25bc4067…` |
| 81 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `dfbbe96817f2e549…` |
| 82 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `8110c37c8a8a470f…` |
| 83 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `62f2a4546f8cf9e4…` |
| 84 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `96066a79ed8596cf…` |
| 85 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `2236d210b27fee18…` |
| 86 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `2804300dc19a5901…` |
| 87 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `918899661518fd73…` |
| 88 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `7a4c93bb994e2986…` |
| 89 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `27bb9109d07807df…` |
| 90 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `db909d444502c857…` |
| 91 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `088d8ff29ed79cf3…` |
| 92 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `bb93b7b0fbfbb6b6…` |
| 93 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `75a654bd15099f15…` |
| 94 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `5c7f3df186f4de4c…` |
| 95 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `d2fbc2a775290d74…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
