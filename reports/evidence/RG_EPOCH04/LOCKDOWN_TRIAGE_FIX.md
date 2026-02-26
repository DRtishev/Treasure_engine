# LOCKDOWN_TRIAGE_FIX.md

STATUS: BLOCKED
REASON_CODE: NT01,SNAP01

## Applied
- Added triage reason surface propagation from victory evidence (precheck/seal/foundation JSON).
- Added RG_TRI01 regression for triage reason-surface contract.

## Gate outcomes
- RG_GIT02: PASS
- RG_VIC01: PASS
- RG_TRI01: PASS
- RG_FOR01: PASS
- RG_NODE01: BLOCKED NT01
- certification victory triage now returns SNAP01 (not generic EC01)

## Notes
- Node truth mismatch remains authoritative blocker on Node 20 runtime.
- Victory seal still blocks in dirty implementation cycle; triage now classifies SNAP01 deterministically.
