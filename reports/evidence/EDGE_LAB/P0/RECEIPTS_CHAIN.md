# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3cb7828b3f1d
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 96 |
| final_chain_hash | `a2c79c5bbe4a3ad668fe6aac4a2524b67374dd2b8f657b0aaf6634d2ca189df4` |
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
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `ad493ba07c665006…` | `e9b72e9f0a185124…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `eda980d1ee55f7eb…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `0c5d93b332282bf4…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `f206c75cee4708e0…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `e0ff366d6c3848ac…` |
| 13 | `EDGE_LAB/FINAL_VERDICT.md` | `031a224280cb1cba…` | `ed39bffe29641f80…` |
| 14 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `48a7f1f0a3b013b0…` |
| 15 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `91bf5edd2ad85fd1…` |
| 16 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `4cf2dc7ba1849a76…` |
| 17 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `7c2794f328e0aef9…` |
| 18 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `62be86426cbc5260…` |
| 19 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `daab101ff3b2bc9c…` |
| 20 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `c3cdda8ace1ae8d6…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `9c9cbdc9b6bbde0b…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `55e3ff6a8a5dac2a…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `5dda46dfcef92763…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `266923b3cffe0626…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `a90f4ef31886cb35…` |
| 26 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `02d026d22950d0c2…` |
| 27 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `39030225fbcd4e25…` |
| 28 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `6974c54b1aa7cbe5…` |
| 29 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `d9f0093b7160a57a…` |
| 30 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `ec9b4217f94daffe…` |
| 31 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `025a12a9449e0436…` |
| 32 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `427368b658a7eb0c…` |
| 33 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `22fc2906efcc30bf…` |
| 34 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `2749e63754c5c3a9…` |
| 35 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `2c4f01a8c031a724…` |
| 36 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `4ab4f2684d686e60…` |
| 37 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `59915b2a37389e5c…` |
| 38 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `d27aae6510ec8e9a…` |
| 39 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `daa55147337577b6…` |
| 40 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `b457d81cc9ec80fc…` |
| 41 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `1e04d218d9d833bd…` |
| 42 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `83bd70c85dbb2407…` |
| 43 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `1932ef284a4ece42…` |
| 44 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `cb57e3d284a6267e…` |
| 45 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `ec48092816c1469e…` |
| 46 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `2eb9b63c490cabfe…` |
| 47 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `0f2a58d47f5c416e…` |
| 48 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `862e1c8d316b062f…` | `ee9520b566e50fdc…` |
| 49 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `5cb1aae2c8b70a8a…` | `7b3abc6060e28f6f…` |
| 50 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `c17dcd3959f23237…` | `c87dd4b8cbac77b0…` |
| 51 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `5e72c5fd8112ad73…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `315b119ab59f82f3…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `8a3ed78dc18b5503…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `2d23ed83a1b56a0a…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `2dcff1195256768f…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `4b23a9b53bceb152…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `f51233e1cb8ddaeb…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `ce3c45115641299b…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `c2c449374c002680…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `0779d2fd13eaa1fa…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `be5df3b969add10f…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `09395a10310da7dd…` |
| 63 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `90b7dd84105b6a78…` |
| 64 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `8fa78ad84f3461f7…` |
| 65 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `53ae428f15dbdb0c…` |
| 66 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `845e2e2b1c77084e…` |
| 67 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `5ff8e50642817a50…` |
| 68 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `0e08285e4498865a…` |
| 69 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `f728a2cc5c9c6db0…` |
| 70 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `fc3465c3cc2dba01…` |
| 71 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `17bb0cb7871cddf6…` |
| 72 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `5991f86ac2157698…` |
| 73 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `d245792dab8843bc…` |
| 74 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `d84e165af9642948…` |
| 75 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `e8cc22a995a1f19c…` |
| 76 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `9102a168bf0522fe…` |
| 77 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `fd9e659380a18dd3…` |
| 78 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `38b1e0e0955a915c…` |
| 79 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `c3ae4b7ea5bd625a…` |
| 80 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `060d274902b003d1…` |
| 81 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `604b8569ef67ad30…` |
| 82 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `a558a734e92163e4…` |
| 83 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `b121b1c5cc8a6538…` |
| 84 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `763fde8c76ba6fad…` |
| 85 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `3311d6283c9ce76d…` |
| 86 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `6dd43a664a8eff50…` |
| 87 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `76ea718566841503…` |
| 88 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `73fb796a4c885398…` |
| 89 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `d21632ed6b395c32…` |
| 90 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `c8b0e8de272d0c3b…` |
| 91 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `82a9f3e5babbb166…` |
| 92 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `d64f6da86edc3462…` |
| 93 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `49840b0f63bda7a2…` |
| 94 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `ef2059f08aabd70d…` |
| 95 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `a2c79c5bbe4a3ad6…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
