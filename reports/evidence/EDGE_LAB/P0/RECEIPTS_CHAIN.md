# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 71bc743467cc
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 96 |
| final_chain_hash | `8705a7b6c6eb250fa1cc063bebedd3b468f0e32bb812d5afb60ecb16c0575b8d` |
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
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `c2c9e559a69f42ac…` | `d43652aa84e607f9…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `a5f403f5f097422d…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `6c4840cab038e883…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `5bb16d380d5e74bf…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `03fc8625a99bf037…` |
| 13 | `EDGE_LAB/FINAL_VERDICT.md` | `1401814a65f6c11a…` | `73885616ee955b1d…` |
| 14 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `870384e86eaa6d64…` |
| 15 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `34c0186dc35d8002…` |
| 16 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `231cc48b1a303acc…` |
| 17 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `682864c00dc1afc4…` |
| 18 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `9d5d87aa5251aa78…` |
| 19 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `d7b8f6b98bfb69fb…` |
| 20 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `d1fec3b37b47f281…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `a5b12b4fd8f5e53b…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `377c768cb042b7a7…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `eb975e2b38cebbbb…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `f90daa11cbb19213…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `b82959a4472d4c41…` |
| 26 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `76d2e5323c0e1468…` |
| 27 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `271cbe7098fef10c…` |
| 28 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `d5e8c87090e23b1d…` |
| 29 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `01ff74caa08c00b2…` |
| 30 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `ab5e12458baa3274…` |
| 31 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `c753affdb937e1bd…` |
| 32 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `6be2578a8dbfd5b0…` |
| 33 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `55af8ede0db06035…` |
| 34 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `383a4f0af787e6b8…` |
| 35 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `e97bbc2623800608…` |
| 36 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `5a5f05ecf2df662f…` |
| 37 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `7ca250ee83bc76f9…` |
| 38 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `5471c3e26ba7ee4f…` |
| 39 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `a9580001056a942e…` |
| 40 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `c5997cc8edf9ee71…` |
| 41 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `0c20ead2a60434e5…` |
| 42 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `6241fe8ddf66601a…` |
| 43 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `b009173f5a33005b…` |
| 44 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `886d11e2a2c51358…` |
| 45 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `8ca60566c3ecc8f4…` |
| 46 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `31c6ade9626c5de2…` |
| 47 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `b991649ba1ed51bd…` | `4eb2396783e8a4d2…` |
| 48 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `fa1d33a5b278532f…` | `5c4057ef278d4daa…` |
| 49 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `e9ec8c0c9c29cc81…` | `136c3d1693c36cd6…` |
| 50 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `ded923d3263681d2…` | `3baab4d8f885993f…` |
| 51 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `70e33426eb873007…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `abdb4e43343451be…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `2cf61033dc34fea9…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `a40d5e8bb1791dc5…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `724995536d461246…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `646fa89d3b83e8ff…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `3ae02f256e8fe301…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `2d5db24d677e5e59…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `455b6cc11707e52d…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `9d07bc6595402408…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `d439bbe2a26b6ec7…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `45ba59f145925c27…` |
| 63 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `7ab5d1824287117c…` |
| 64 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `8d33d6a1b5bc127d…` |
| 65 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `55883eaf2e6d7bec…` |
| 66 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `710f0de073511a49…` |
| 67 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `c080168c296948d9…` |
| 68 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `657b92ee25254b89…` |
| 69 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `b154accf9a332907…` |
| 70 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `612bcb594974a3d3…` |
| 71 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `d7a1f702d051e5a6…` |
| 72 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `669fb97f7b3b0f95…` |
| 73 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `1216a3fca42051e8…` |
| 74 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `a75f6c83a63cb57b…` |
| 75 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `93b23701c175d69b…` |
| 76 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `742d286f1274a6d3…` |
| 77 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `76393a87997cf6a8…` |
| 78 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `e824034f9b3ecbe8…` |
| 79 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `b113ae7d616d6987…` |
| 80 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `c019cc8222c9c117…` |
| 81 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `1e3f7bbb608e158d…` |
| 82 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `40bbce60f95f40e8…` |
| 83 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `0ce818ab662bdc9d…` |
| 84 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `4d5b6d21dea90ced…` |
| 85 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `77c5d20179398404…` |
| 86 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `d0145449b0b136f6…` |
| 87 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `35944f1d1562bbbc…` |
| 88 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `71a9a75d3a0a508b…` |
| 89 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `714af7542329c248…` |
| 90 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `cdfe07f1f58331ef…` |
| 91 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `1ebf6d9211704514…` |
| 92 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `1ce362e134a2a17d…` |
| 93 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `17e8b2c781e60f84…` |
| 94 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `0b04fa7cc743b844…` |
| 95 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `8705a7b6c6eb250f…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
