# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: cef301f25c52
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 97 |
| final_chain_hash | `7c7528ffda8e956990c86aecadca315159760f51c5cbc714d195f4dddae0a702` |
| scope_manifest_sha | `b5fae5c478d1f7bcf8453b9a558107ae009a84de51c05b60e9175fe638f90f5c` |
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
| 5 | `EDGE_LAB/DEP_POLICY.md` | `ea4fc2238e4090f5…` | `aee7cac71731dd56…` |
| 6 | `EDGE_LAB/ERROR_BUDGET_POLICY.md` | `fbd5cc865ac70276…` | `3011cfe9b5fc4c69…` |
| 7 | `EDGE_LAB/EVIDENCE_CANON_RULES.md` | `021ba0511726a903…` | `8ddcfb0eff0e2309…` |
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `81dd710b3f613e38…` | `7381d2b2b0cf5fd9…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `b18d6df6bb0b215e…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `f073f4da548e9691…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `46a397946be0f56e…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `5deb8c40be8c4d27…` |
| 13 | `EDGE_LAB/FINAL_VERDICT.md` | `357790e659caea04…` | `70dab97c3e519dd4…` |
| 14 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `4d9ba73bd0c41d8c…` |
| 15 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `e3cde575eedd5168…` |
| 16 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `14da1789bbb2ccfa…` |
| 17 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `cc44942f83325baa…` |
| 18 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `a153dd8a80b6785a…` |
| 19 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `b32161c2659cf0cc…` |
| 20 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `350a5c03494ef1e9…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `accca126fad82b2d…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `2a09ec32f2aff70b…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `ad9abc0500806ccf…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `d2607b5a63adb1bf…` |
| 25 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `c8ca925f7f2e8a17…` |
| 26 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `ce050af00ebbc925…` |
| 27 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `34df623c547dcdde…` |
| 28 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `5dad2daefe838ec4…` |
| 29 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `14444e5ccb771481…` |
| 30 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `2149f39a23878d60…` |
| 31 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `e3086e9e2808412c…` |
| 32 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `f8767f0e11f873fb…` |
| 33 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `becc65139981b801…` |
| 34 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `e69b67aff5534bd7…` |
| 35 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `1c9d7cc5837558d0…` |
| 36 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `b149c520e5cf9fb7…` |
| 37 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `0e0a0c9a0e33767f…` |
| 38 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `c85de60b91ab31e6…` |
| 39 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `68d6c9a6707097e9…` |
| 40 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `a7cd2efc514badef…` |
| 41 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `82bd0691bfe3d53e…` |
| 42 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `e6a7670473976a91…` |
| 43 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `567b148c77e92e8a…` |
| 44 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `c62f18ffd4025250…` |
| 45 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `b521733842f3dce6…` |
| 46 | `reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md` | `f50d779dcc1a4d9d…` | `9a7bd70110f39916…` |
| 47 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `34dd026d5a6f6d3d…` | `4df214783ef8e39f…` |
| 48 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `afd689d9c551a08d…` | `25b1342e3f4cfe8b…` |
| 49 | `reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md` | `384478062caba3af…` | `bc2c3afa69392081…` |
| 50 | `reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json` | `9431c646d624245e…` | `1fdb1bf1ee99bc5c…` |
| 51 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `bb667da3f4a702fb…` | `fae105d8103fb2f2…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `434915dc715d2f11…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `7556edbaa60558ad…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `79e903856979e970…` | `a81d5cf7c0fa9e89…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `9e0e3c4b6687d181…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `fab4d69bdea95e8b…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `56e0ecaab2c5a734…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `3808ccb598fc2061…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `c9c8eb3c7d710942…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `a4fca35383f48396…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `0e342166215254f7…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `dec1b7cde00c48b6…` |
| 63 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `3ec82dea1971c386…` |
| 64 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `e094cb5cd87d9f2c…` |
| 65 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `8e9340a91b54f922…` |
| 66 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `8a5ff717ad3c8f98…` |
| 67 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `157dfe236e48494f…` |
| 68 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `2b67130036c8128f…` | `1e271b8c18fc14d4…` |
| 69 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `df7505cd446b93c0…` | `d2ede263d81270f9…` |
| 70 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `a1a2a2bbd6263319…` |
| 71 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `ff142349047677cf…` |
| 72 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `fc95e9e6974f7e14…` |
| 73 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `639c01c7cec03c65…` | `ac15824ee0968352…` |
| 74 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `7d317fcbfaed9ae6…` |
| 75 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `35231c995c8ef9b6…` |
| 76 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `dcfef30f5ab925c7…` |
| 77 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `1e36089dd91757f0…` |
| 78 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `f12ef969156de533…` |
| 79 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `aaf1ca46bed1ad55…` |
| 80 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `c5ad9868b6322d14…` |
| 81 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `8f524181dc06256a…` |
| 82 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `fbe814830742f4c7…` |
| 83 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `184edc7167108ef7…` |
| 84 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `530bd63f7184400b…` |
| 85 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `b8e4c115938bea59…` |
| 86 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `b8cabf727677b389…` |
| 87 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `63bc5c47b8935417…` |
| 88 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `224479733401c83c…` |
| 89 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `e69ebd8c4d45e73f…` |
| 90 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `57d4b88a07855f95…` |
| 91 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `5a9d7512d722b4fc…` |
| 92 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `9c628d8c40b4578a…` |
| 93 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `fd5bff5f0e7ab15d…` |
| 94 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `0f6561d97e3da554…` |
| 95 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `acdc9194e8833440…` |
| 96 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `7c7528ffda8e9569…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
