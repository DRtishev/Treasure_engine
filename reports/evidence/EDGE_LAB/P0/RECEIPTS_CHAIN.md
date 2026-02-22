# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 74a96076b41f
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 98 |
| final_chain_hash | `8be1280f4ee575edcb553d217f95004017fc24f86d5c8105c5859f6e0ca58fb4` |
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
| 5 | `EDGE_LAB/DEP_POLICY.md` | `da988ee18713d7d9…` | `450ea2af96b4db59…` |
| 6 | `EDGE_LAB/ERROR_BUDGET_POLICY.md` | `fbd5cc865ac70276…` | `5e1f8d648b4f5aaa…` |
| 7 | `EDGE_LAB/EVIDENCE_CANON_RULES.md` | `021ba0511726a903…` | `2997e6a8d80257e7…` |
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `5862a96ea9a54865…` | `a9be5b50bb78063e…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `8fd2bc87ade6a45f…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `425f619e4727a05c…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `e014d982b4f05437…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `533d7e8f111f3f4f…` |
| 13 | `EDGE_LAB/FINAL_VERDICT.md` | `179e028a05065b95…` | `89d5143872fd1caa…` |
| 14 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `401f2e0728e8ec8d…` |
| 15 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `0f2ad8aa6d112b39…` |
| 16 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `f3e2be838663fa75…` |
| 17 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `2fd8ad01b55c87f5…` |
| 18 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `754ae4b439e73381…` |
| 19 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `9f8bc28c9d805792…` |
| 20 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `683ae97e83db7389…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `5e163484e813f234…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `261a216e8de29b50…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `ec4bc0d7790eda24…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `5481fc7b62489eea…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `ba0cae5deda41c92…` |
| 26 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `3f8b23f0282e6311…` |
| 27 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `b39d30aa273a9a1c…` |
| 28 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `cea0dca7fccc70a1…` |
| 29 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `16d60846d0a29c6f…` |
| 30 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `9f5c046d2fdaed53…` |
| 31 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `b1ad5082b7c9f789…` |
| 32 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `50e4cc061a43da8d…` |
| 33 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `cee88f3aa19e75da…` |
| 34 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `f4c4a672af4d9c84…` | `20268be4304448e0…` |
| 35 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `7fb45e3a8fd17173…` |
| 36 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `dfdf43a04dcf1719…` |
| 37 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `327e76b50881d652…` |
| 38 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `7b0688a21206d4d1…` |
| 39 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `474af4eb8c9d0383…` |
| 40 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `f8e37e634e5543db…` |
| 41 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `38aaa1df910f13c7…` |
| 42 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `644c81895b603b0d…` |
| 43 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `c7d6b2e6815b4bf7…` |
| 44 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `fee900d40e9f1590…` |
| 45 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `38ebdfa7299a6dd3…` |
| 46 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `3516f2dc1760e2ef…` |
| 47 | `reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md` | `5ff7e8568df37269…` | `1644dddacc5505ab…` |
| 48 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `df2f9b8e22326cb6…` | `03c4c91d1f5fd444…` |
| 49 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `6a86af4666b9f412…` | `41286aa4a804a2a7…` |
| 50 | `reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md` | `ae4a978c6f3e3d91…` | `e5865ce8ad2f8aa9…` |
| 51 | `reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json` | `9ab77ab749bc291e…` | `00d17b3970789889…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `6c27ec8f55bda63d…` | `3093b1b75f757bf1…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `f088382ba81aafb9…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `2e57a993c4f629c4…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `a8ac35921944d468…` | `deaceb820a8ca690…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `433e0400c6454953…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `e83ea875661b8b3a…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `47290f37b8d7fc58…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `5e6eed29cdc2d676…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `167e338c65cef82b…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `a021bd9dfe074788…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `276ca811fecbee00…` |
| 63 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `2f6862b7e1a2e282…` |
| 64 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `092334c0c92b9b76…` |
| 65 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `fe6e8d17bb826faf…` |
| 66 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `ef115c869c4fb04d…` |
| 67 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `20f868df783e82d0…` |
| 68 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `e0cbb853a42fbd30…` |
| 69 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `2b67130036c8128f…` | `575d15bc9554dbb5…` |
| 70 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `df7505cd446b93c0…` | `200b5f60ee9f0f0f…` |
| 71 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `3ba20947fbdd982b…` |
| 72 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `68deed81e0791bf1…` |
| 73 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `85288a406d43b348…` |
| 74 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `639c01c7cec03c65…` | `4b3042367928cab1…` |
| 75 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `faf6ea2da4ac5027…` |
| 76 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `3f58734b6db3c74b…` |
| 77 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `f15439645eefea14…` |
| 78 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `84ee0973adc32b52…` |
| 79 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `fa9fc2b0400ef366…` |
| 80 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `300b69342bc558fe…` | `5e91d8fe7d4ab869…` |
| 81 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `54c16662618afb0e…` |
| 82 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `c5b7ab5f754f5534…` |
| 83 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `873127488036ab97…` |
| 84 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `cf8b5927acd0df18…` |
| 85 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `b115fc688f428e07…` |
| 86 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `27505747b0eacadc…` |
| 87 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `cee2b82629b7a9d7…` |
| 88 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `a60312227932c393…` |
| 89 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `ce326315e987dbaa…` |
| 90 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `fa316d04e8019579…` |
| 91 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `3f2ca91bdead633b…` |
| 92 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `5bbadd67dc938c21…` |
| 93 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `251abf997977bf43…` |
| 94 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `c3094f1fa51d888c…` |
| 95 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `054cc5c3e164823a…` |
| 96 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `fd9a5c3cbf605adf…` |
| 97 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `8be1280f4ee575ed…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
