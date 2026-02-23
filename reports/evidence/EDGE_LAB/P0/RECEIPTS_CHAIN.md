# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: PASS
REASON_CODE: NONE
RUN_ID: b68b470a2f03
NEXT_ACTION: Proceed to DATA_COURT.

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | 116 |
| final_chain_hash | `60912cb82100ed1bc1bb80428c5eac201a78dcf45c510acb8670e9a8a153fe09` |
| scope_manifest_sha | `e7b38c740dd76f72a139cf6cf26411f49250ab1a68da4aea2710df0f475900c6` |
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
| 4 | `EDGE_LAB/DELTA_CALC_SPEC.md` | `875dc47af399cd06…` | `f14b0a58dd2b64d9…` |
| 5 | `EDGE_LAB/DEP_POLICY.md` | `857c544a6609997b…` | `d18c7f7c2c07513e…` |
| 6 | `EDGE_LAB/ERROR_BUDGET_POLICY.md` | `fbd5cc865ac70276…` | `d7f3e9b35615f42d…` |
| 7 | `EDGE_LAB/EVIDENCE_CANON_RULES.md` | `021ba0511726a903…` | `f5a9977e2032e1e3…` |
| 8 | `EDGE_LAB/EVIDENCE_INDEX.md` | `56e857749b0d4ea7…` | `043ab098d2ba1ca3…` |
| 9 | `EDGE_LAB/EXECUTION_MODEL.md` | `6072ee361588d9ea…` | `a76800a5b79354ef…` |
| 10 | `EDGE_LAB/EXECUTION_REALITY_POLICY.md` | `79c313a9e3578c25…` | `97a00babcf4ff4b7…` |
| 11 | `EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md` | `2ef6481e548f8cea…` | `429207fcc2737d53…` |
| 12 | `EDGE_LAB/EXECUTOR_ENTRYPOINT_DOCTRINE.md` | `b7c2ce5051762b3b…` | `db7dfd1abaa5a802…` |
| 13 | `EDGE_LAB/EXPECTANCY_CI_POLICY.md` | `7cff212a4ce580c4…` | `f95852e59d8a3ac9…` |
| 14 | `EDGE_LAB/EXPECTANCY_POLICY.md` | `c7a45d923b14dc19…` | `7412fa5b1f3baed6…` |
| 15 | `EDGE_LAB/FINAL_VERDICT.md` | `6eea6cebc4dd227f…` | `1eef6645f6f88b11…` |
| 16 | `EDGE_LAB/GATE_FSM_SPEC.md` | `381bf240e65dbe92…` | `618ce54844f06514…` |
| 17 | `EDGE_LAB/HACK_REGISTRY.md` | `9e40f7916cb116cb…` | `9c738bfc9ffef09a…` |
| 18 | `EDGE_LAB/HACK_SCHEMA.md` | `93ebb1445493c3cb…` | `7dd2e0982beafc25…` |
| 19 | `EDGE_LAB/HYPOTHESIS_REGISTRY.md` | `ceda190573d8016d…` | `2a52baf8c1701a1e…` |
| 20 | `EDGE_LAB/INCIDENT_PLAYBOOK.md` | `7360902b98e192ac…` | `2537b4ebb6269b4b…` |
| 21 | `EDGE_LAB/MANIFEST_CHECK.md` | `5d56586c6036727e…` | `8c474500fd063f8a…` |
| 22 | `EDGE_LAB/MICRO_LIVE_SRE_POLICY.md` | `cced6551d3098e24…` | `9cc7b2ab24ba8381…` |
| 23 | `EDGE_LAB/OVERFIT_COURT_RULES.md` | `b77fef0aefdea029…` | `cf0368d9dc50a4ad…` |
| 24 | `EDGE_LAB/OVERFIT_POLICY.md` | `c3ed08d18fc63e6e…` | `8f54f3eebf12c1a5…` |
| 25 | `EDGE_LAB/PAPER_EVIDENCE_FIXTURES_REPORT.md` | `548dcd469f77cfb5…` | `bbcf9e7b48cd0dfc…` |
| 26 | `EDGE_LAB/PAPER_EVIDENCE_IMPORT.md` | `4cba942954f36a5b…` | `c90b82969abdc095…` |
| 27 | `EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md` | `d5ac318ea709b7fd…` | `413aeefc488f8410…` |
| 28 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA.md` | `f73490a9bf2e342b…` | `9f4c1d6a5fcc76fe…` |
| 29 | `EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md` | `25323f7ed407b1b4…` | `bfc5917e73020cb7…` |
| 30 | `EDGE_LAB/PAPER_EVIDENCE_SPEC.md` | `108b569795570af6…` | `09ec4d618b972348…` |
| 31 | `EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md` | `7e658133010c0fdb…` | `4404c8eb256f2655…` |
| 32 | `EDGE_LAB/POML_V6_FINAL_REPORT.md` | `0697ca0928425358…` | `043ec3dad9bd79a1…` |
| 33 | `EDGE_LAB/PORTFOLIO_POLICY.md` | `51f6c2cbe13e2fd8…` | `5998f3b078016ebd…` |
| 34 | `EDGE_LAB/POSTMORTEM_TEMPLATE.md` | `389b045f4b0a2f01…` | `58f6e0a3f524e4b9…` |
| 35 | `EDGE_LAB/PROFIT_CANDIDATES_V1.md` | `7b1952479e713c4f…` | `f13c90e727310a09…` |
| 36 | `EDGE_LAB/PROXY_GUARD_POLICY.md` | `da87f607a9e0298a…` | `a5c53e15cf00057a…` |
| 37 | `EDGE_LAB/PROXY_VALIDATION.md` | `e378da66df71168a…` | `6cc321bbe7c60d48…` |
| 38 | `EDGE_LAB/REASON_CODES.md` | `f4d62746b660dfd5…` | `fb08be8b047dabb0…` |
| 39 | `EDGE_LAB/REASON_CODES_BIBLE.md` | `b63ebf00dcf28b55…` | `a115935fd15cdeee…` |
| 40 | `EDGE_LAB/RED_TEAM_PLAYBOOK.md` | `8ec882dd68f5e62f…` | `2108ede2db5fb974…` |
| 41 | `EDGE_LAB/REGIME_MATRIX.md` | `1934c1dfa8bfe0e6…` | `45d76082999947f5…` |
| 42 | `EDGE_LAB/REGISTRY_CHANGELOG.md` | `e71fdea0815703b6…` | `b90ae37e42a4a82b…` |
| 43 | `EDGE_LAB/RESEARCH_INTAKE.md` | `9fc1ae9f8b3c58df…` | `22b2a1ee846b99d1…` |
| 44 | `EDGE_LAB/RISK_FSM.md` | `d169e038871b8708…` | `171e15e214552f02…` |
| 45 | `EDGE_LAB/RUNBOOK_EDGE.md` | `dd125c5eed997cea…` | `1d6bc52ee59ce835…` |
| 46 | `EDGE_LAB/SLO_SLI.md` | `eaab4af6922ff5ed…` | `7f9f86955cfb1af8…` |
| 47 | `EDGE_LAB/SOURCES_POLICY.md` | `43a16aef44becd21…` | `770fe534d0b3e721…` |
| 48 | `EDGE_LAB/TRIALS_LEDGER.md` | `e2012a174d72c136…` | `99dfb7026f84f4ee…` |
| 49 | `EDGE_LAB/UPDATE_SCOPE_POLICY.md` | `2fd5ec49ffa3376e…` | `4c8a9a56eb657018…` |
| 50 | `EDGE_LAB/VERDICT_SEMANTICS.md` | `fc6d6d3bf66d6e86…` | `6df00efc13300c54…` |
| 51 | `EDGE_LAB/WALK_FORWARD_PROTOCOL.md` | `0cbb83e53e415b15…` | `942817ea7ba52b7e…` |
| 52 | `reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md` | `5a28031b20351469…` | `91757df0707363dc…` |
| 53 | `reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md` | `b85586a833b7db9a…` | `606393123bbfeb37…` |
| 54 | `reports/evidence/EDGE_LAB/P0/DATA_COURT.md` | `43dfc29a3b0d386c…` | `140bf775dff2ec6b…` |
| 55 | `reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json` | `a1efe8c97b8577d7…` | `87b3c65fcf7c1954…` |
| 56 | `reports/evidence/EDGE_LAB/gates/manual/execution_reality_court.json` | `aeda39d0f7f47706…` | `ca3e813b7c39c006…` |
| 57 | `reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json` | `69cd40db926c2f2f…` | `42212b106798b25a…` |
| 58 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json` | `96ae517f3a497d6f…` | `4ab0741a8a5e7857…` |
| 59 | `reports/evidence/EDGE_LAB/gates/manual/micro_live_sre.json` | `b6487984d4efaf4f…` | `74ed40a2ad315ae5…` |
| 60 | `reports/evidence/EDGE_LAB/gates/manual/multi_hypothesis_court.json` | `ae0420249fd66a47…` | `1734a96a874727ef…` |
| 61 | `reports/evidence/EDGE_LAB/gates/manual/paper_court.json` | `c05005ba88bf0ed7…` | `9189aceb74492482…` |
| 62 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json` | `712b34a6362e99e1…` | `d6662d779ff11168…` |
| 63 | `reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json` | `1bd6e3f18f917d4b…` | `72d3049cde282274…` |
| 64 | `reports/evidence/EDGE_LAB/gates/manual/portfolio_court.json` | `3b2cb0ced69bb5de…` | `a0cd5758cdcadaf5…` |
| 65 | `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json` | `58733a3a6e5bcfb8…` | `4fa75ff1e502289d…` |
| 66 | `reports/evidence/EDGE_LAB/gates/manual/proxy_guard.json` | `17aa0f5a66fb6ca3…` | `e41096190301adec…` |
| 67 | `reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json` | `91cc301912c009b1…` | `1c6fb2802802142e…` |
| 68 | `scripts/edge/edge_lab/canon.mjs` | `ade10bdc908214c4…` | `383d0d6d15b3004e…` |
| 69 | `scripts/edge/edge_lab/canon_selftest.mjs` | `ccede35e7a7395b4…` | `1126176f082496c1…` |
| 70 | `scripts/edge/edge_lab/edge_all.mjs` | `ec41693cb4d65006…` | `ad58b5fa095fae90…` |
| 71 | `scripts/edge/edge_lab/edge_all_x2.mjs` | `4f4639684eceb0bc…` | `f56e431692e5fa68…` |
| 72 | `scripts/edge/edge_lab/edge_calm_mode_p0.mjs` | `b5289d8ccf9710d9…` | `5c62d114860208ac…` |
| 73 | `scripts/edge/edge_lab/edge_calm_p0_x2.mjs` | `635df1d136509860…` | `3ba2aa8d355e042f…` |
| 74 | `scripts/edge/edge_lab/edge_data_court.mjs` | `e40ee8617ff97b41…` | `c098354ba947db91…` |
| 75 | `scripts/edge/edge_lab/edge_dataset.mjs` | `35949338a13f9130…` | `a919e88752ec8401…` |
| 76 | `scripts/edge/edge_lab/edge_doctor.mjs` | `5ab06e282835529f…` | `15f8cf7a44eb38b9…` |
| 77 | `scripts/edge/edge_lab/edge_evidence_hashes.mjs` | `9fc9f12b09b1ce6c…` | `76617fd98e7c6a5e…` |
| 78 | `scripts/edge/edge_lab/edge_execution.mjs` | `192177a72fd0ce6b…` | `e781fdd484a34275…` |
| 79 | `scripts/edge/edge_lab/edge_execution_grid.mjs` | `9acf26aae9b4091b…` | `58cc7b6a42088ba7…` |
| 80 | `scripts/edge/edge_lab/edge_execution_reality.mjs` | `500e6352e2efba90…` | `c0f366446b57f328…` |
| 81 | `scripts/edge/edge_lab/edge_execution_reality_court.mjs` | `29cda45d2808c601…` | `c3f55459bfa74181…` |
| 82 | `scripts/edge/edge_lab/edge_expectancy_ci.mjs` | `4af8778eaeaf1dfd…` | `9fcf74ace733b247…` |
| 83 | `scripts/edge/edge_lab/edge_expectancy_court.mjs` | `99afd7af03668332…` | `cf413c61e0ac787e…` |
| 84 | `scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs` | `f92524173b85553a…` | `fb7a6a086fed7ec5…` |
| 85 | `scripts/edge/edge_lab/edge_ledger.mjs` | `eec56f645cea66e8…` | `bcb88a26d06733ff…` |
| 86 | `scripts/edge/edge_lab/edge_micro_live_readiness.mjs` | `bab48b0aa9fae792…` | `0718b172e1e85011…` |
| 87 | `scripts/edge/edge_lab/edge_micro_live_sre.mjs` | `be6b8c8ed23884ea…` | `f3f798369446e700…` |
| 88 | `scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs` | `b3f72b35362521a9…` | `5b61d2361813d82c…` |
| 89 | `scripts/edge/edge_lab/edge_next_epoch.mjs` | `b95fd698ec6cb097…` | `83c863665e719b9e…` |
| 90 | `scripts/edge/edge_lab/edge_overfit.mjs` | `739134e7eadcbfbe…` | `d156790dc4d51ca4…` |
| 91 | `scripts/edge/edge_lab/edge_overfit_court_mvp.mjs` | `8bb441b6040ceef9…` | `0d5746fcb7d2b3a3…` |
| 92 | `scripts/edge/edge_lab/edge_paper_evidence.mjs` | `33c2a31e68256775…` | `0204025b02299916…` |
| 93 | `scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs` | `196646e0b578f0a3…` | `f287081385ef3b76…` |
| 94 | `scripts/edge/edge_lab/edge_paper_ingest.mjs` | `bca8ea1591271dae…` | `fab23e2b22660386…` |
| 95 | `scripts/edge/edge_lab/edge_portfolio_court.mjs` | `39388001ca211a7e…` | `cafb1f7d60f98c54…` |
| 96 | `scripts/edge/edge_lab/edge_profit_00_closeout.mjs` | `d28b1af257b27389…` | `24113d8b575fa3ea…` |
| 97 | `scripts/edge/edge_lab/edge_profit_00_doctor.mjs` | `7c083a6c990889f5…` | `0e66a0208a0b621d…` |
| 98 | `scripts/edge/edge_lab/edge_profit_00_expect_blocked_conflict.mjs` | `1da46caf8a44a866…` | `56c161c2b7a863c2…` |
| 99 | `scripts/edge/edge_lab/edge_profit_00_paths.mjs` | `5993bbb60fe2d6c7…` | `fb39d2f2bcaa083b…` |
| 100 | `scripts/edge/edge_lab/edge_profit_00_x2.mjs` | `637405f3b3dfe709…` | `00fc3e34241587c0…` |
| 101 | `scripts/edge/edge_lab/edge_profit_01_super.mjs` | `b23a50af2f8b152a…` | `28bc15a9c2d4f3c5…` |
| 102 | `scripts/edge/edge_lab/edge_profit_candidates.mjs` | `6243223ac863e97c…` | `d81c857d8c041b63…` |
| 103 | `scripts/edge/edge_lab/edge_raw_x2.mjs` | `7b7df6836d96cb4d…` | `928323d0e2eb2b5a…` |
| 104 | `scripts/edge/edge_lab/edge_receipts_chain.mjs` | `e98030165a11cd13…` | `2dd6b5ca58cb63b2…` |
| 105 | `scripts/edge/edge_lab/edge_redteam.mjs` | `9722a85c364d3fce…` | `ea816413d0b0c6d8…` |
| 106 | `scripts/edge/edge_lab/edge_registry.mjs` | `9c082ef998dc4ca4…` | `d73a4bb729d69460…` |
| 107 | `scripts/edge/edge_lab/edge_risk.mjs` | `5038d834d4472b8c…` | `72241e297f9f596a…` |
| 108 | `scripts/edge/edge_lab/edge_sources.mjs` | `750c3fbf4cefb4a7…` | `a4327d4a2f79e548…` |
| 109 | `scripts/edge/edge_lab/edge_sre.mjs` | `4aa7523ed661b107…` | `0664343d05988bef…` |
| 110 | `scripts/edge/edge_lab/edge_verdict.mjs` | `50705fc8466f7b54…` | `a39e7e577c50a28a…` |
| 111 | `scripts/edge/edge_lab/edge_walk_forward_lite.mjs` | `902ec6a161cccb1b…` | `12f77895f612bc98…` |
| 112 | `scripts/edge/edge_lab/paper_epoch_runner.mjs` | `1ef02b9cc48b197f…` | `c85cf596340cc728…` |
| 113 | `scripts/edge/edge_lab/paper_telemetry_import_csv.mjs` | `02e43b66388dfa52…` | `4674d852f8bf7350…` |
| 114 | `scripts/edge/edge_lab/paper_telemetry_real_stub_gen.mjs` | `f93a3f04672505f6…` | `74616c90158d20a1…` |
| 115 | `scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs` | `dec02f9e858a7b27…` | `60912cb82100ed1b…` |

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
