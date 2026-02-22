# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: f615eb934eb0
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 98 |
| final_chain_hash | `6d9fe808c77727434a7c82defbcdb626b4ff466db2117341155901e916ca1413` |
| scope_manifest_sha | `606837aeb57be66a817eac492b2bbba24c651e646e0590644f9114954a8ff992` |
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
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `fbdfae9195382aeb…` | `cb7a3e3b546b75c9…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `53236dd7d9c55e0f…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `b15bff643e7912ba…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `4874714e4fd8a091…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `6e333e380064f4e2…` |
| 13 | `EDGE_LAB/FINAL_VERDICT.md` | `517465d50f4ef04c…` | `d5a4247b8d0e4619…` |
| 14 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `fa80d1b824adaccf…` |
| 15 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `12efcaebf22e054d…` |
| 16 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `be1d31b31e455f84…` |
| 17 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `2fb2c02caa28d123…` |
| 18 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `8a1681296629d726…` |
| 19 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `a3878c283934d55c…` |
| 20 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `34b301ff33219d2b…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `1faab9b0975d06d3…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `45e7da47f779ff71…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `2dbec805b6965052…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `211795473340b0a8…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `ccb657407f2bc046…` |
| 26 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `941b69971c074a0a…` |
| 27 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `a447516be31636e4…` |
| 28 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `70d7e0a961a10d8a…` |
| 29 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `d8bec4313c0c563b…` |
| 30 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `824dcd185abd114b…` |
| 31 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `3274d7168c83c61d…` |
| 32 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `8c0571dc75adfdd5…` |
| 33 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `d447708c3743c384…` |
| 34 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `e8d7ae90d0d6c15f…` |
| 35 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `0281b753516561b5…` |
| 36 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `5b210114d9bab097…` |
| 37 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `81ec5e9754b2c4c1…` |
| 38 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `1caf9f32a6805602…` |
| 39 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `1444fde53520f012…` |
| 40 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `c6f75939d3d0e1e9…` |
| 41 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `23d24b587717a5f9…` |
| 42 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `cd074e135be587bd…` |
| 43 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `4da546c5d5efd96e…` |
| 44 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `88f67b9dc0ac6870…` |
| 45 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `ed59f403bba58bdb…` |
| 46 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `0586d6c33df9c10b…` |
| 47 | `reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md` | `1e5508b164e220f9…` | `c222e23f5c401361…` |
| 48 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `6b03efb27965d783…` | `50b07a31db18c6ed…` |
| 49 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `d431f4685aea2825…` | `10e89c9043d5e395…` |
| 50 | `reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md` | `6a8f3d1d9ea22dbb…` | `e3963f5fe807cca9…` |
| 51 | `reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json` | `b1d0c2db2a0b155e…` | `cd65cca487b3d11c…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `6bf15297da39b1c8…` | `b5cb34ff1ebe175a…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `8517ca93a39eed5c…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `16926501bddf3964…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `79e903856979e970…` | `61261b7e283ce911…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `cc997b564d42b2c5…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `374f1ed8225b122b…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `016bb319dd1c4205…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `66c95f47df0fbb8b…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `17fefd7c87237348…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `e0287131de6fd46b…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `ba5d9cd0c78cc5e8…` |
| 63 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `886a60f6f5048152…` |
| 64 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `4241ed6ecf908cfa…` |
| 65 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `da67a696e5261879…` |
| 66 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `886d9f5e66bd5928…` |
| 67 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `85c2c62b7e828dfd…` |
| 68 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `2bcdb00e6cb2b935…` |
| 69 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `2b67130036c8128f…` | `bc81f3bf196efce0…` |
| 70 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `df7505cd446b93c0…` | `eb2467d7ece48d91…` |
| 71 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `5ec5b78ea1b6d513…` |
| 72 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `ff97d8db915c67c9…` |
| 73 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `f4b885016bf4766a…` |
| 74 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `639c01c7cec03c65…` | `6cac30b90bb809ff…` |
| 75 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `9b12e61a1de60128…` |
| 76 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `945344d06f8479ad…` |
| 77 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `0e9cdd66ee085ebc…` |
| 78 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `d01db5c6243ecf9d…` |
| 79 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `3be74b666d199e4b…` |
| 80 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `868c0a4b9b22b7b7…` |
| 81 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `03cccc25b02930bf…` |
| 82 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `51a7ceb6c03302e6…` |
| 83 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `38a2ed4b8b207899…` |
| 84 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `1b7ccfa8aa8ce591…` |
| 85 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `ba0bfcf50eeb8c2d…` |
| 86 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `4190b646aa10d7a9…` |
| 87 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `71316bc983574bcd…` |
| 88 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `5960a0da5a1b962f…` |
| 89 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `b27603a29b8e6fb7…` |
| 90 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `f07b4d994b7f3b64…` |
| 91 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `da3346b8b957e5cc…` |
| 92 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `090e0bb0820f0593…` |
| 93 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `b1cadee4cf4e1d84…` |
| 94 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `1afe65f79a1541e5…` |
| 95 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `1a20a5d1cd12462d…` |
| 96 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `076997a8e62e1a84…` |
| 97 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `6d9fe808c7772743…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
