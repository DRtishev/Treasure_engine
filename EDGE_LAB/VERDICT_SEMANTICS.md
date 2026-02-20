# VERDICT_SEMANTICS

Canonical readiness semantics for next-epoch gate:

- `PIPELINE_ELIGIBLE`: all EDGE_LAB courts PASS.
- `TESTING_SET_ELIGIBLE`: same as pipeline eligibility.
- `PAPER_ELIGIBLE`: same as testing-set eligibility.
- `LIVE_ELIGIBLE`: always `false` by default (requires explicit release-governor unlock and evidence).

Final next-epoch closeout verdict:
- `PASS`: all required gates PASS.
- `BLOCKED`: any gate is non-PASS, with mandatory `REASON_CODE` and `NEXT_ACTION`.
