# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 2c52a286482d
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 96 |
| final_chain_hash | `48fed294dbd1a80c0675043ce71e6ff8d944f405550d8b438d2c45b435f6f655` |
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
| 5 | `EDGE_LAB/DEP_POLICY.md` | `ea4fc2238e4090f5…` | `aee7cac71731dd56…` |
| 6 | `EDGE_LAB/ERROR_BUDGET_POLICY.md` | `fbd5cc865ac70276…` | `3011cfe9b5fc4c69…` |
| 7 | `EDGE_LAB/EVIDENCE_CANON_RULES.md` | `021ba0511726a903…` | `8ddcfb0eff0e2309…` |
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `296ccc0cda797453…` | `9e5744633de9479b…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `3107cd9fa66efefb…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `042e30da225dabea…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `f2767fd3a3866cf6…` |
| 12 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `c58bec1aff06f2e1…` |
| 13 | `EDGE_LAB/FINAL_VERDICT.md` | `80d6eb1fc8148286…` | `991a94f30bb066ad…` |
| 14 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `0a39243b9a3a4e5a…` |
| 15 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `a3b9f7d13102484b…` |
| 16 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `80e6e0f1b01903d9…` |
| 17 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `f4ddae20fc7cb5a5…` |
| 18 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `47d61c8beb4f4aae…` |
| 19 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `8e6b38ec818b60ad…` |
| 20 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `bf1d69b55a97e6a2…` |
| 21 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `eb9ef3cb72bb8fa6…` |
| 22 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `b2a3947ef1e22d61…` |
| 23 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `0809727a9c7fcddd…` |
| 24 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `4e4d68083d35b2b5…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `f873f781a5fcbf40…` |
| 26 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `4a8c1b9105996bb4…` |
| 27 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `d82a30f22bd47dea…` |
| 28 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `c74c79f536ca124f…` |
| 29 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `e742130a833a45b0…` |
| 30 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `f3d895f715176c5c…` |
| 31 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `1d86162186f3ed76…` |
| 32 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `95c84ab7c100dd48…` |
| 33 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `7f8577f3a0802677…` |
| 34 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `dd6db3f207b25f58…` |
| 35 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `b23593fe5ce1f8cf…` |
| 36 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `bec4b3fa54c044f9…` |
| 37 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `176cd68f694dc0bc…` |
| 38 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `eaa9cf0aaf265c22…` |
| 39 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `a64c67a7fd498927…` |
| 40 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `ac7c84ee61f1ccbf…` |
| 41 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `e42b7feef9c57f03…` |
| 42 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `c5644682206e65bf…` |
| 43 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `e6f50260a0b79c57…` |
| 44 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `baf744fa1a33af06…` |
| 45 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `070141ec57167cb9…` |
| 46 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `58701b68b8a5961e…` |
| 47 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `c31c016e50ad4139…` | `ab1e6af108d84909…` |
| 48 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `441d4a1a966e54da…` | `a2844ef5e5ee3378…` |
| 49 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `a9ca626febd10ead…` | `b89ad89a09f5aa5a…` |
| 50 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `004df77553230586…` | `94de5bcd8538fd73…` |
| 51 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `c582f991a4759344…` |
| 52 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `fd6aa1c5b8b4beff…` |
| 53 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `561aea3b4d03688a…` |
| 54 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `378935fd1bb20740…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `7d398a6708b81136…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `0a0e0cda8c9e47a1…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `b07c1a1a0c97e6ac…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `e755dbcdf7874055…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `9700f01f10e7ccf8…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `99f3b0e2b11f4298…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `bd7e91500c1249ee…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `aac7febd945fac16…` |
| 63 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `5ac186e3c9c3dd72…` |
| 64 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `ef65734d5d34daff…` |
| 65 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `e81ddf8e73304b9e…` |
| 66 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `7d70b3a0b69cc7cf…` |
| 67 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `071ec83340e8c318…` |
| 68 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `3fb444615667ba8c…` |
| 69 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `b6633f7cd9c144c9…` |
| 70 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `bde62add672876a7…` |
| 71 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `3766939cd1cfaba5…` |
| 72 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `1110708a195912c2…` |
| 73 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `c37b5535929c380e…` |
| 74 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `8afc61e3f05c7bf4…` |
| 75 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `b731d36e5837d2c7…` |
| 76 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `4e67b7b1d2db1a2e…` |
| 77 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `88bb0a1bc0b60a72…` |
| 78 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `2e1f6f5d601350b7…` |
| 79 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `df5973682ae8bbcf…` |
| 80 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `60ee0cf8aa71139f…` |
| 81 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `63cae3b05a9c63aa…` |
| 82 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `3bf3af8d588e814b…` |
| 83 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `770745510162771d…` |
| 84 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `3cd6a0aba1a4dd45…` |
| 85 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `96d7e62d5fe300f0…` |
| 86 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `b7824ca979f7be7c…` |
| 87 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `18e6f9dd1c2818e1…` |
| 88 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `c462242cd7a08a66…` |
| 89 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `a29f6a94599161dc…` |
| 90 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `084cff59761be02b…` |
| 91 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `837a26e6b21a592a…` |
| 92 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `cb6282a6cb39eb07…` |
| 93 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `9fbb2f1883535fdb…` |
| 94 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `c4eb5ffb8fdd2913…` |
| 95 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `48fed294dbd1a80c…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
