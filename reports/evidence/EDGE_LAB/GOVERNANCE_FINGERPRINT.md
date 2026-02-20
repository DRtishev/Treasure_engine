# GOVERNANCE_FINGERPRINT.md — Contract Integrity Snapshot
generated_at: RUN_ID
script: edge_verdict.mjs

## Purpose
SHA256 fingerprint of EDGE_LAB source contract files and edge_lab scripts at closeout.
Scope: EDGE_LAB/*.md (excluding generated artifacts) + scripts/edge/edge_lab/*.mjs
Excluded: FINAL_VERDICT.md, EVIDENCE_INDEX.md (pipeline-generated, contain run timestamps).
Tamper-evident: any post-closeout modification to contract files produces a different fingerprint.

## Overall Fingerprint
```
OVERALL_SHA256: 2acfecd4e985016104aa2688a1ef8c77c93f152fc31e00ef2e0aabb6aec4585d
```

## File Fingerprints
| File | SHA256 |
|------|--------|
| EDGE_LAB/COURT_MANIFEST.md | d7dfa7116a931a128124c1552e800dbb57720ed92e55a52276a2bfbc37dd7d19 |
| EDGE_LAB/DATASET_CONTRACT.md | d58e82f882583db6c098e6fc63e2a813c74585e8506d69ad5995a00ebf2b938b |
| EDGE_LAB/ERROR_BUDGET_POLICY.md | fbd5cc865ac70276692369d206399754d863f38c11cadf5064212744b36c38fc |
| EDGE_LAB/EXECUTION_MODEL.md | 6072ee361588d9ea048acf2ec978c7ee69a189d67477a5b22cbdc93edf2a0ada |
| EDGE_LAB/EXECUTION_REALITY_POLICY.md | f253a39d8d7d3f6bf7c8fb8ba3b1c730a664a6d8e70b3118fb31c9a55f04dc7a |
| EDGE_LAB/EXECUTION_SENSITIVITY_SPEC.md | 2ef6481e548f8cead408f2697cc496a3243685756e2f81a27116c2825fc407f6 |
| EDGE_LAB/HACK_REGISTRY.md | 9e40f7916cb116cba1ee2476eab229f6f60a13fae7992341bf559b97c5b767d3 |
| EDGE_LAB/HACK_SCHEMA.md | 93ebb1445493c3cb68fb17dbaa78d665b11f7bbe4100c13a6a9ed0c02e7cff35 |
| EDGE_LAB/MANIFEST_CHECK.md | 5d56586c6036727e47075727edf4cabf137be73bc38adbf279259c7f041dbb35 |
| EDGE_LAB/OVERFIT_COURT_RULES.md | b77fef0aefdea029444a5e2d1f1da0efd53d8ca5399fc7d2da92a0f07d6788ba |
| EDGE_LAB/PAPER_TO_MICRO_LIVE_PROTOCOL.md | 7e658133010c0fdbcd2fddb2b40d19fb39306c06dad0ff1e15a0511931b1e182 |
| EDGE_LAB/POSTMORTEM_TEMPLATE.md | 389b045f4b0a2f01d476fe436ec8e1f6761e68261aeaa600ee54285b5f28c8d4 |
| EDGE_LAB/PROFIT_CANDIDATES_V1.md | 7b1952479e713c4f1809b1537389ca2da5d2564ba78a1e7019696a06cb05cb28 |
| EDGE_LAB/PROXY_GUARD_POLICY.md | da87f607a9e0298a8debe0e251df9e3970ef8576e6eeac79cc496c74ffdaf4bc |
| EDGE_LAB/PROXY_VALIDATION.md | e378da66df71168a631aa9e666316e21a0b658e547428f67fb2b2ece8f140a59 |
| EDGE_LAB/REASON_CODES.md | b0dbeeb0f7d7bf59b2c851f36e52c37533c31e7aa865241687a3f3583b00152c |
| EDGE_LAB/RED_TEAM_PLAYBOOK.md | 8ec882dd68f5e62fd30c34b8aa901a400bdd5f5afea788da4b0ea46a20fcefe9 |
| EDGE_LAB/REGISTRY_CHANGELOG.md | e71fdea0815703b60b72b2ab71409fb3c6c7cac92f040f4e325454fb7290ea21 |
| EDGE_LAB/RESEARCH_INTAKE.md | 9fc1ae9f8b3c58df03a12b6fd97bc3a16736e11149ea3cae0432c0e7f2d0ad8c |
| EDGE_LAB/RISK_FSM.md | d169e038871b8708035875b691735cae989c8f7e4e7776765b1cfb11e43a5fd6 |
| EDGE_LAB/RUNBOOK_EDGE.md | f007079bb2c69dbcb9cff85e2c596244a4f69c486ddbfbee66e8162a237cc3ca |
| EDGE_LAB/SLO_SLI.md | eaab4af6922ff5edb42a7d9069f6d75c6761f491d96b75b7ee707752e23622ac |
| EDGE_LAB/SOURCES_POLICY.md | 43a16aef44becd2113e10a8317df7054e5b3b423777b656a3cddc57f0f0a2389 |
| EDGE_LAB/TRIALS_LEDGER.md | e2012a174d72c136c833e363bb4d05ec045d1d04c900d915eb24ee4ee5951e6b |
| EDGE_LAB/VERDICT_SEMANTICS.md | fc6d6d3bf66d6e867d2ff3611e861b1b2277813fd74b73634bf315b50e139439 |
| EDGE_LAB/WALK_FORWARD_PROTOCOL.md | 0cbb83e53e415b157294b92ac140a6b9593c1a7eb78069352f80dccbcd962b98 |
| scripts/edge/edge_lab/canon.mjs | cfea85cfe563c388e5df1856eddd3b78e0e5e3945bf6d6bcc753d1e0d550792b |
| scripts/edge/edge_lab/edge_all.mjs | b6b408d5acfa20406e9496c489b15ccb4fce0f6fbc9e7f600f35e612368b6ea0 |
| scripts/edge/edge_lab/edge_all_x2.mjs | 4e23cc46228206b3562ae52ff3baf1d821c6d67f65317616c1592bdd71dd0045 |
| scripts/edge/edge_lab/edge_dataset.mjs | 35949338a13f91304801c4b5b5e78eea6330b6ac5ee609e5e48ca84e66733293 |
| scripts/edge/edge_lab/edge_execution.mjs | 192177a72fd0ce6b88e72dea70dfb98182dc3471c956ac3fe8e2a8277b636bad |
| scripts/edge/edge_lab/edge_execution_grid.mjs | 9acf26aae9b4091b4a46eed4aaddf93f40f0a212bc4947a5d2596525eaccea19 |
| scripts/edge/edge_lab/edge_execution_reality.mjs | 9ceb12d52a2d49bc8f8903cbd6d2b0bbd7eff0f33b7046e13123d7aaff8d6a4b |
| scripts/edge/edge_lab/edge_ledger.mjs | 41c441ea4e1371420a12222b7d85192535aa746844e89d33bd157681b37e8489 |
| scripts/edge/edge_lab/edge_micro_live_readiness.mjs | 1ce3caab6f602de213aad21b0662d1ceb3929bf60825c3fa8c3f539de1975660 |
| scripts/edge/edge_lab/edge_next_epoch.mjs | fdf10b501a93ce70fb03c63ce5b7ded4ca640462830d4fd0b4c0a49031e9c9e9 |
| scripts/edge/edge_lab/edge_overfit.mjs | 739134e7eadcbfbe9d5a7fbb0a08757d99aa187ed7b657c172d8d9891814853b |
| scripts/edge/edge_lab/edge_profit_candidates.mjs | 6243223ac863e97ca687e03bead7b49a1f21ba59bf44828427a0f0d7ee6b3307 |
| scripts/edge/edge_lab/edge_raw_x2.mjs | 7b7df6836d96cb4de68497783582afb58658fec62aba11945cdd6e6897bcaef9 |
| scripts/edge/edge_lab/edge_redteam.mjs | 9722a85c364d3fcea8059956158430b39eca70bc4c5b7ed664b916a0446d27be |
| scripts/edge/edge_lab/edge_registry.mjs | 9c082ef998dc4ca403fc2156dd0fdee70e5bc7f491aea55bff21ebe46bb1e209 |
| scripts/edge/edge_lab/edge_risk.mjs | 5038d834d4472b8ce5cd8c1b3b72a55af8a3b7b378aa9490764fc1454c14a4c1 |
| scripts/edge/edge_lab/edge_sources.mjs | 750c3fbf4cefb4a704e93cf0232dcdcfb6aacd7f344371ca3f341bff96b0068a |
| scripts/edge/edge_lab/edge_sre.mjs | 4aa7523ed661b107df28ccfdceec56fae679f8e1d7c20912ee6351bb39188e7d |
| scripts/edge/edge_lab/edge_verdict.mjs | 9d266683bcffa6de88886632acb6441cf9a1243aacd7bd88c8dcd6b016d3215b |

## Verification
To verify: recompute SHA256 of each file and compare to this table.
Any mismatch indicates post-closeout contract modification.
NEXT_ACTION: Include in SHA256SUMS via edge:ledger (automatic — this file is in evidence root).
