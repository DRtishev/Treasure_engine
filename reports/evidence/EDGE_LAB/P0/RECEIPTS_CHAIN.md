# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: cad9c4ea3904
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 100 |
| final_chain_hash | `f5391d36ea2cb89713ef8af9d84cb995466151e267f784be4e3412eedb968fa2` |
| scope_manifest_sha | `dc6b57d9f79fd1b0f662189c2ef79e868a30f3351ed2e738ea1a6efaf3d5a228` |
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
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `aefef31d8a512a64…` | `4df50295e8ea256e…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `63c0e8ffa362cbdf…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `8fdcbf5b4766a053…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `052e6b161dc72b99…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `9a25fa70c2da6b67…` |
| 13 | `EDGE_LAB/FINAL_VERDICT.md` | `a75e5b15038aeaa4…` | `5187423ec82731a2…` |
| 14 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `249929b174706285…` |
| 15 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `6668f6a78324f2a5…` |
| 16 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `d5be846852261f62…` |
| 17 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `4fede408ed454f0f…` |
| 18 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `6cc9b58c4979acb6…` |
| 19 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `6c832cbeebc4407a…` |
| 20 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `97690ba4d32ba980…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `91b8f9fb8de8859a…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `a61237e14d0eb402…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `d465c2a4e7509681…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `2fef6417d9836992…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `ba67c2412f0a2028…` |
| 26 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `0a845eede0f9047a…` |
| 27 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `4a5fe93af988c0df…` |
| 28 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `fa08a93ddbeb59b7…` |
| 29 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `66a95715aaedcc18…` |
| 30 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `86a37f0c00ac7534…` |
| 31 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `85d9b86aabe5abe3…` |
| 32 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `7679a635518bca73…` |
| 33 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `6f9b4489480b4df2…` |
| 34 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `4cc053554560cb60…` |
| 35 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `09066dc2e0549595…` |
| 36 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `608e08df1ba1a713…` |
| 37 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `66de07867d793cd3…` |
| 38 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `a36e4791f4a34874…` |
| 39 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `9fed43d71c30537b…` |
| 40 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `bb8d8b7ca6cf5235…` |
| 41 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `8713304661552651…` |
| 42 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `facd756a6649c6e4…` |
| 43 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `c0408b3dcd11436e…` |
| 44 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `8f4bcc5548b2325e…` |
| 45 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `21087f3bea46c74c…` |
| 46 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `c4d755978e1feff3…` |
| 47 | `reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md` | `e3035df4cf81afd5…` | `bee43ee002777251…` |
| 48 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `6b54e8513c0e8e92…` | `ba98e07dc049bd87…` |
| 49 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `5ee1f8311d139bf6…` | `0ece8662fa85bdc2…` |
| 50 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `277195660d656642…` | `a91f92742d4fb45c…` |
| 51 | `reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md` | `05aa3088539a44dc…` | `05cd083b90ca3f18…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json` | `e42b7183632db5e8…` | `98bb0aa53188b09d…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json` | `3e0c8afb9b17eabc…` | `e26c028288df57d7…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `0f5bfdecbb78de62…` | `b64c4dce913d6b90…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `36b596b75da9b064…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `aca1a9a6d5472ffc…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `54a11c89bb2d8ffb…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `ca04359ee5a07c96…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `e497667471e1ea5c…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `0a1cb79f8eace2a5…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `dd474c3072668c4a…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `a8ffbdc8c7ec9dc9…` |
| 63 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `4563628db5eda00d…` |
| 64 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `7d794cd99925c82f…` |
| 65 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `da3b8bd4b9b2ae49…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `331df86cace98de2…` |
| 67 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `66f8146310166c75…` |
| 68 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `162f96cc4ab930f0…` |
| 69 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `2400693ebb1c7d6f…` |
| 70 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `e7fe454bf09f179b…` |
| 71 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `2b67130036c8128f…` | `a55205705ca7ca03…` |
| 72 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `df7505cd446b93c0…` | `fedfa2f5dd61acc8…` |
| 73 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `46d3993bd10da77c…` |
| 74 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `1c70507cc92d8f12…` |
| 75 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `31eec3b4e6988f2a…` |
| 76 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `639c01c7cec03c65…` | `ff42f087f20d9bf2…` |
| 77 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `20f55e72b0f4071d…` |
| 78 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `8bbf335c88dcbf9a…` |
| 79 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `65f6a9df414a4547…` |
| 80 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `666185ceb01e5062…` |
| 81 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `f5635a8d592bf64a…` |
| 82 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `0911f16547dcaad2…` |
| 83 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `51386d1dc87da0c7…` |
| 84 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `6e75e6bf5480e4a0…` |
| 85 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `a5e7bee924a5ce1f…` |
| 86 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `c0a505c66adc97c3…` |
| 87 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `86b77c7d3d0be534…` |
| 88 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `ef4cc98d38abd738…` |
| 89 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `b6aa288fd7f8b6fd…` |
| 90 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `6b04c48c9c1e895d…` |
| 91 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `a661bcd99e228f75…` |
| 92 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `c4fb3540f254984f…` |
| 93 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `9264ed6c5336edc0…` |
| 94 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `67cb1a7e4e043e7a…` |
| 95 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `64bf4faff68b89a8…` |
| 96 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `97dffb84cc169667…` |
| 97 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `d87789b05a740c83…` |
| 98 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `691cbb3ea4ecbb8d…` |
| 99 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `f5391d36ea2cb897…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
