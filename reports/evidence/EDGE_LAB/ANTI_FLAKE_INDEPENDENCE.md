# ANTI_FLAKE_INDEPENDENCE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: b4de92324329
NEXT_ACTION: Proceed. edge:all is verified deterministic.

## Methodology

Runs edge:all (producer pipeline) twice consecutively.
Each run wipes EVIDENCE_DIR and rebuilds all court outputs.
After each run: applies stableEvidenceNormalize() to all .md files, then SHA256-fingerprints all files.
Compares fingerprints between run1 and run2.
This check is INDEPENDENT of edge:next-epoch readiness gates.

## Fingerprints

| Run | Fingerprint |
|-----|-------------|
| run1 | 0fab53eda0deb3bdc3519efc6dab7f9f40017a078c8f50bd833e94a83cd427c4 |
| run2 | 0fab53eda0deb3bdc3519efc6dab7f9f40017a078c8f50bd833e94a83cd427c4 |

## File Hash Matrix

| File | SHA256 run1 (prefix) | SHA256 run2 (prefix) | Status |
|------|---------------------|---------------------|--------|
| DATASET_COURT.md | 935bb2155279c6fc… | 935bb2155279c6fc… | MATCH |
| EVIDENCE_INDEX.md | 4796ace15c9a024e… | 4796ace15c9a024e… | MATCH |
| EXECUTION_BREAKPOINTS.md | c71a2cac123734ef… | c71a2cac123734ef… | MATCH |
| EXECUTION_COURT.md | c9ee470a5374df31… | c9ee470a5374df31… | MATCH |
| EXECUTION_DRIFT.md | 97919aa4be815a36… | 97919aa4be815a36… | MATCH |
| EXECUTION_REALITY_COURT.md | 75e882250c330b5d… | 75e882250c330b5d… | MATCH |
| EXECUTION_SENSITIVITY_GRID.md | 32ad70e26f8244a5… | 32ad70e26f8244a5… | MATCH |
| EXPECTANCY_CI.md | f7955b970a78ea12… | f7955b970a78ea12… | MATCH |
| GOVERNANCE_FINGERPRINT.md | a9d41578018d4415… | a9d41578018d4415… | MATCH |
| MCL_NOTES.md | 9314f186ee025f29… | 9314f186ee025f29… | MATCH |
| MEGA_CLOSEOUT_EDGE_LAB.md | ebc3add576686623… | ebc3add576686623… | MATCH |
| MICRO_LIVE_READINESS.md | 20366733f55c3263… | 20366733f55c3263… | MATCH |
| MICRO_LIVE_SRE.md | 5a8a61a8591eb0b9… | 5a8a61a8591eb0b9… | MATCH |
| MULTI_HYPOTHESIS_COURT.md | b82691c7b199fabf… | b82691c7b199fabf… | MATCH |
| OVERFIT_COURT.md | 8cd1c17774066761… | 8cd1c17774066761… | MATCH |
| PAPER_COURT.md | 32c082e6b73087eb… | 32c082e6b73087eb… | MATCH |
| PAPER_EVIDENCE.md | bd6ded662937a43d… | bd6ded662937a43d… | MATCH |
| PAPER_EVIDENCE_COURT.md | a5caa5d057e951c6… | a5caa5d057e951c6… | MATCH |
| PORTFOLIO_COURT.md | 6666353fa3f60e51… | 6666353fa3f60e51… | MATCH |
| PROFIT_CANDIDATES_COURT.md | 66bfd37a5d717800… | 66bfd37a5d717800… | MATCH |
| REDTEAM_COURT.md | 7fe3a5a5def28b47… | 7fe3a5a5def28b47… | MATCH |
| REGISTRY_COURT.md | 63813ac6796637ed… | 63813ac6796637ed… | MATCH |
| RISK_COURT.md | 6828d2b8d9cf2ada… | 6828d2b8d9cf2ada… | MATCH |
| SLI_BASELINE.md | b80f0fe66dcea44f… | b80f0fe66dcea44f… | MATCH |
| SNAPSHOT.md | 4cdea9af6e85795f… | 4cdea9af6e85795f… | MATCH |
| SOURCES_AUDIT.md | 2b0cc03444b77dc9… | 2b0cc03444b77dc9… | MATCH |
| SRE_COURT.md | b09fc923a5f59f93… | b09fc923a5f59f93… | MATCH |
| VERDICT.md | 1dd27f25e3b74315… | 1dd27f25e3b74315… | MATCH |

## DRIFT_FILES

- NONE

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/anti_flake_independence.json
